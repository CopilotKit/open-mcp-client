import json
from typing_extensions import Literal, TypedDict, Dict, List, Union, Optional
from litellm import completion
from crewai.flow.flow import Flow, start, router, listen
from copilotkit.crewai import copilotkit_stream, CopilotKitState
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.client.sse import sse_client
import os
import asyncio
from contextlib import AsyncExitStack

# Define MCP connection types
class StdioConnection(TypedDict):
    command: str
    args: List[str]
    transport: Literal["stdio"]

class SSEConnection(TypedDict):
    url: str
    transport: Literal["sse"]

# Type for MCP configuration
MCPConfig = Dict[str, Union[StdioConnection, SSEConnection]]

# Default MCP configuration
DEFAULT_MCP_CONFIG: MCPConfig = {
    "math": {
        "command": "python",
        "args": ["/home/tomgeorge/workspace/copilot-sdk/open-mcp-client-with-spreadsheet/agent/math_server.py"],
        "transport": "stdio",
    },
    # "hackernews": {
    #     "url": "https://mcp.composio.dev/hackernews/whining-substantial-caravan-NhJ2ij",
    #     "transport": "sse",
    # }
}

class AgentState(CopilotKitState):
    """
    Agent state with MCP configuration support
    """
    language: Literal["english", "spanish"] = "english"
    mcp_config: MCPConfig = DEFAULT_MCP_CONFIG

# Original weather tool
GET_WEATHER_TOOL = {
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "Get the current weather in a given location",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string", 
                    "description": "The city and state, e.g. San Francisco, CA"
                }
            },
            "required": ["location"]
        }
    }
}

tool_handlers = {
    "get_weather": lambda args: f"The weather for {args['location']} is 70 degrees."
}

def convert_mcp_tool_to_json_format(tool):
    """
    Convert an MCP tool to a JSON-serializable OpenAI-compatible format.
    """
    if not hasattr(tool, 'name') or not hasattr(tool, 'inputSchema'):
        raise ValueError(f"Invalid tool object: {tool}")
    
    # Build properties dictionary safely
    properties = {}
    required = []
    
    if hasattr(tool, 'inputSchema') and tool.inputSchema:
        if isinstance(tool.inputSchema, dict):
            properties = tool.inputSchema.get('properties', {})
            required = tool.inputSchema.get('required', [])
    
    return {
        "type": "function",
        "function": {
            "name": tool.name,
            "description": getattr(tool, 'description', f"Tool: {tool.name}"),
            "parameters": {
                "type": "object",
                "properties": properties,
                "required": required
            }
        }
    }

class MCPToolManager:
    """
    Manages MCP tool connections and tool execution
    """
    def __init__(self):
        self.active_sessions = {}
        self.exit_stack = AsyncExitStack()
        
    async def initialize_servers(self, mcp_config):
        """
        Initialize all MCP servers from configuration
        """
        all_tools = []
        mcp_tools_dict = {}
        
        for server_name, config in mcp_config.items():
            try:
                if config["transport"] == "stdio":
                    session, tools = await self._initialize_stdio_server(server_name, config)
                elif config["transport"] == "sse":
                    session, tools = await self._initialize_sse_server(server_name, config)
                else:
                    print(f"Unsupported transport type for {server_name}: {config['transport']}")
                    continue
                    
                if session and tools:
                    self.active_sessions[server_name] = session
                    mcp_tools_json = [convert_mcp_tool_to_json_format(tool) for tool in tools]
                    mcp_tools_dict.update({tool.name: (session, tool) for tool in tools})
                    all_tools.extend(mcp_tools_json)
                    
            except Exception as e:
                print(f"Error initializing {server_name}: {str(e)}")
                continue
                
        return all_tools, mcp_tools_dict
    
    async def _initialize_stdio_server(self, server_name, config):
        """Initialize a stdio server and return its session and tools"""
        try:
            server_params = StdioServerParameters(
                command=config["command"],
                args=config["args"]
            )
            stdio_transport = await self.exit_stack.enter_async_context(stdio_client(server_params))
            read, write = stdio_transport
            session = await self.exit_stack.enter_async_context(ClientSession(read, write))
            await session.initialize()
            
            # Get tools from the server
            tools_response = await session.list_tools()
            
            # Extract tools from response - handle both direct access and tuple format
            if hasattr(tools_response, 'tools'):
                tools = tools_response.tools
            elif isinstance(tools_response, tuple) and len(tools_response) > 1:
                tools = tools_response[1]
            else:
                print(f"Unexpected tools response format from {server_name}: {tools_response}")
                return None, []
                

            return session, tools
            
        except Exception as e:
            print(f"Error connecting to stdio server {server_name}: {str(e)}")
            return None, []
    
    async def _initialize_sse_server(self, server_name, config):
        """Initialize an SSE server and return its session and tools"""
        try:
            sse_transport = await self.exit_stack.enter_async_context(sse_client(config["url"]))
            read, write = sse_transport
            session = await self.exit_stack.enter_async_context(ClientSession(read, write))
            await session.initialize()
            
            # Get tools from the server
            tools_response = await session.list_tools()
            
            # Extract tools from response - handle both direct access and tuple format
            if hasattr(tools_response, 'tools'):
                tools = tools_response.tools
            elif isinstance(tools_response, tuple) and len(tools_response) > 1:
                tools = tools_response[1]
            else:
                print(f"Unexpected tools response format from {server_name}: {tools_response}")
                return None, []
                
            return session, tools
            
        except Exception as e:
            print(f"Error connecting to SSE server {server_name}: {str(e)}")
            return None, []
            
    async def execute_tool(self, tool_name, tool_args, mcp_tools_dict):
        """
        Execute an MCP tool
        """
        try:
            if tool_name not in mcp_tools_dict:
                return f"Tool {tool_name} not found in available MCP tools"
                
            session, tool = mcp_tools_dict[tool_name]
            result = await session.call_tool(tool_name, arguments=tool_args)
            return result
            
        except Exception as e:
            return f"Error executing tool {tool_name}: {str(e)}"
            
    async def cleanup(self):
        """Close all active sessions"""
        try:
            await self.exit_stack.aclose()
            self.active_sessions = {}
        except Exception as e:
            print(f"Error during MCP tool manager cleanup: {e}")

class SampleAgentFlow(Flow[AgentState]):
    """
    Optimized flow with MCP support using recursive tool handling
    """
    def __init__(self):
        print("Initializing OptimizedAgentFlow")
        super().__init__(initial_state={"mcp_config": DEFAULT_MCP_CONFIG})
        self.mcp_manager = MCPToolManager()
        self.tool_call_count = 0
        self.MAX_TOOL_CALLS = 10  # Safety limit to prevent infinite recursion

    @start()
    @listen("route_follow_up")
    async def start_flow(self):
        """Entry point for the flow"""
        print("Starting flow")

    @router(start_flow)
    async def chat(self):
        """Chat node with MCP tools integration"""
        try:
            print("Processing chat")
            print(f"Current state: {self.state}")
            
            # Get MCP configuration
            mcp_config = getattr(self.state, 'mcp_config', DEFAULT_MCP_CONFIG)
            
            # System prompt based on language setting
            system_prompt = f"You are a helpful assistant. Talk in {self.state.language}."
            
            # Initialize base tools
            all_tools = [*self.state.copilotkit.actions, GET_WEATHER_TOOL]
            
            # Initialize MCP servers and get tools
            mcp_tools, mcp_tools_dict = await self.mcp_manager.initialize_servers(mcp_config)
            all_tools.extend(mcp_tools)
            
            # Get names of MCP tools for reference
            mcp_tool_names = [tool["function"]["name"] for tool in mcp_tools]

            # Create a single shared context for the recursive tool handling
            tool_context = {
                "all_tools": all_tools,
                "mcp_tool_names": mcp_tool_names,
                "mcp_tools_dict": mcp_tools_dict,
                "system_prompt": system_prompt
            }
            
            # Make the initial LLM call
            await self.process_llm_call(tool_context)
            
            return "route_end"
            
        except Exception as e:
            print(f"Error in chat node: {str(e)}")
            return "route_end"
        finally:
            # Ensure we clean up MCP sessions
            await self.mcp_manager.cleanup()
    
    async def process_llm_call(self, tool_context):
        """
        Make an LLM call and handle any resulting tool calls recursively
        
        Args:
            tool_context: Dictionary containing tools configuration and context
        """
        print(f"\n--- LLM Call {self.tool_call_count + 1} ---")
        
        # Make the LLM call
        response = await copilotkit_stream(
            completion(
                model="openai/gpt-4o",
                messages=[
                    {"role": "system", "content": tool_context["system_prompt"]},
                    *self.state.messages
                ],
                tools=tool_context["all_tools"],
                stream=True
            )
        )
        
        # Process the response
        message = response.choices[0].message
        self.state.messages.append(message)
        
        # If there are tool calls, handle them recursively
        if message.get("tool_calls"):
            await self.handle_tool_calls(message["tool_calls"], tool_context)
    
    async def handle_tool_calls(self, tool_calls, tool_context):
        """
        Handle tool calls recursively
        
        Args:
            tool_calls: List of tool calls from the LLM response
            tool_context: Dictionary containing tools configuration and context
        """
        # Increment tool call counter
        self.tool_call_count += 1
        
        # Check if we've reached the maximum number of tool calls
        if self.tool_call_count >= self.MAX_TOOL_CALLS:
            print(f"Reached maximum tool call limit ({self.MAX_TOOL_CALLS}), stopping recursion")
            return
            
        
        # Process all tool calls in this message
        for tool_call in tool_calls:
            tool_call_id = tool_call["id"]
            tool_call_name = tool_call["function"]["name"]
            
            # Safely parse tool arguments
            try:
                tool_call_args = json.loads(tool_call["function"]["arguments"])
            except json.JSONDecodeError:
                tool_call_args = {}
                
            
            # Skip CopilotKit actions
            if tool_call_name in [action["function"]["name"] for action in self.state.copilotkit.actions]:
                print("Detected CopilotKit action - skipping handling")
                continue
            
            # Process tool result
            result = None
                
            # Handle MCP tools
            if tool_call_name in tool_context["mcp_tool_names"]:
                print(f"Executing MCP tool: {tool_call_name}")
                result = await self.mcp_manager.execute_tool(
                    tool_call_name, 
                    tool_call_args, 
                    tool_context["mcp_tools_dict"]
                )
            else:
                # Handle regular tools
                print(f"Executing regular tool: {tool_call_name}")
                handler = tool_handlers.get(tool_call_name)
                if handler:
                    result = handler(tool_call_args)
                else:
                    result = f"Unknown tool: {tool_call_name}"
                    
            # Add tool result to conversation
            print(f"Tool result: {result}")
            self.state.messages.append({
                "role": "tool",
                "content": str(result),
                "tool_call_id": tool_call_id
            })
        
        # Make a recursive LLM call with all tool results
        await self.process_llm_call(tool_context)

    @listen("route_end")
    async def end(self):
        """End the flow"""
        print(f"Flow completed after {self.tool_call_count} tool call iterations")

# Example usage
if __name__ == "__main__":
    flow = SampleAgentFlow()
    asyncio.run(flow.run())



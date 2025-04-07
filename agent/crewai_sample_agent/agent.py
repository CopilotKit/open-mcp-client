import json
from typing_extensions import Literal, TypedDict, Dict, List, Union, Optional
from litellm import completion
from crewai.flow.flow import Flow, start, router, listen
from copilotkit.crewai import copilotkit_stream, CopilotKitState
from langchain_mcp_adapters.client import MultiServerMCPClient
import os

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
        "args": [os.path.join(os.path.dirname(__file__), "..", "math_server.py")],
        "transport": "stdio",
    },
}

class AgentState(CopilotKitState):
    """
    Agent state with MCP configuration support
    """
    language: Literal["english", "spanish"] = "english"
    mcp_config: MCPConfig = DEFAULT_MCP_CONFIG  # Set default value

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

# Initial tools list (will be extended with MCP tools)
tools = [GET_WEATHER_TOOL]

tool_handlers = {
    "get_weather": lambda args: f"The weather for {args['location']} is 70 degrees."
}

def convert_structured_tool_to_json_format(tool):
    """
    Convert a LangChain StructuredTool to a JSON-serializable OpenAI-compatible format.
    """
    return {
        "type": "function",
        "function": {
            "name": tool.name,
            "description": tool.description,
            "parameters": tool.args_schema if tool.args_schema else {"type": "object", "properties": {}}
        }
    }

class SampleAgentFlow(Flow[AgentState]):
    """
    Sample flow with MCP support
    """
    def __init__(self):
        super().__init__(initial_state={"mcp_config": DEFAULT_MCP_CONFIG})

    @start()
    @listen("route_follow_up")
    async def start_flow(self):
        """
        Entry point for the flow
        """

    @router(start_flow)
    async def chat(self):
        """
        Chat node with MCP tools integration
        """
        print("chat is working")
        # Access mcp_config directly instead of using get()
        mcp_config = self.state.mcp_config if self.state.mcp_config else DEFAULT_MCP_CONFIG
        system_prompt = f"You are a helpful assistant. Talk in {self.state.language}."

        # Initialize MCP client and get tools
        async with MultiServerMCPClient(mcp_config) as mcp_client:
            # Get MCP tools and process them
            mcp_tools_raw = mcp_client.get_tools()
            # Convert MCP tools to JSON-serializable format and store raw tools
            mcp_tools_json = [convert_structured_tool_to_json_format(tool) for tool in mcp_tools_raw]
            # Create a dictionary of tool names to StructuredTool objects for execution
            mcp_tools_dict = {tool.name: tool for tool in mcp_tools_raw}
            mcp_tool_names = [tool["function"]["name"] for tool in mcp_tools_json]

            # Combine all tools for the model
            all_tools = [
                *self.state.copilotkit.actions,
                GET_WEATHER_TOOL,
                *mcp_tools_json  # Add JSON-serializable MCP tools
            ]

            # Run the model with all available tools
            response = await copilotkit_stream(
                completion(
                    model="openai/gpt-4o",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        *self.state.messages
                    ],
                    tools=all_tools,
                    parallel_tool_calls=False,
                    stream=True
                )
            )
            message = response.choices[0].message
            self.state.messages.append(message)

            # Handle tool calls or direct response
            if message.get("tool_calls"):
                tool_call = message["tool_calls"][0]
                tool_call_id = tool_call["id"]
                tool_call_name = tool_call["function"]["name"]
                tool_call_args = json.loads(tool_call["function"]["arguments"])

                # Check if it's a CopilotKit action
                if tool_call_name in [action["function"]["name"] for action in self.state.copilotkit.actions]:
                    return "route_end"

                # Handle MCP tools using the StructuredTool's invoke method
                if tool_call_name in mcp_tool_names:
                    tool = mcp_tools_dict[tool_call_name]
                    result = await tool.ainvoke(tool_call_args)  # Use ainvoke for async execution
                else:
                    # Handle regular tools
                    handler = tool_handlers.get(tool_call_name)
                    if handler:
                        result = handler(tool_call_args)
                    else:
                        result = f"Unknown tool: {tool_call_name}"

                # Append the tool response to the message history
                tool_response = {
                    "role": "tool",
                    "content": str(result),  # Convert result to string if needed
                    "tool_call_id": tool_call_id
                }
                self.state.messages.append(tool_response)

                # Make a follow-up call to the model with the updated message history
                follow_up_response = await copilotkit_stream(
                    completion(
                        model="openai/gpt-4o",
                        messages=[
                            {"role": "system", "content": system_prompt},
                            *self.state.messages
                        ],
                        tools=all_tools,
                        parallel_tool_calls=False,
                        stream=True
                    )
                )

                follow_up_message = follow_up_response.choices[0].message
                self.state.messages.append(follow_up_message)
                return "route_end"  # End after processing the tool response

            # If no tool call, it's a direct response
            return "route_end"

    @listen("route_end")
    async def end(self):
        """
        End the flow
        """

# Example usage (for testing purposes)
if __name__ == "__main__":
    flow = SampleAgentFlow()
    flow.run()


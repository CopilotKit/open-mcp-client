import { CopilotChat } from "@copilotkit/react-ui";
import { CopilotActionHandler } from "./components/CopilotActionHandler";
import { CopilotKitCSSProperties } from "@copilotkit/react-ui";
import { MCPConfigForm } from "./components/MCPConfigForm";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Client component that sets up the Copilot action handler */}
      <CopilotActionHandler />

      {/* Main content area */}
      <div className="flex-1 p-8 mr-[30vw]">
        <MCPConfigForm />
      </div>

      {/* Fixed sidebar */}
      <div
        className="fixed top-0 right-0 h-full w-[30vw] border-l bg-white shadow-md"
        style={
          {
            "--copilot-kit-primary-color": "#4A4A4A",
          } as CopilotKitCSSProperties
        }
      >
        <CopilotChat
          className="h-full flex flex-col"
          instructions={
            "You are assisting the user as best as you can. Answer in the best way possible given the data you have."
          }
          labels={{
            title: "MCP Assistant",
            initial: "Need any help?",
          }}
        />
      </div>
    </div>
  );
}

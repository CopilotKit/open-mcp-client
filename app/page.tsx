"use client";

import { CopilotChat } from "@copilotkit/react-ui";
import { CopilotActionHandler } from "./components/CopilotActionHandler";
import { CopilotKitCSSProperties } from "@copilotkit/react-ui";
import { MCPConfigForm } from "./components/MCPConfigForm";
import { useState, useEffect } from "react";
import SpreadsheetRenderer from "./components/SpreadsheetRenderer";
import { INSTRUCTIONS } from "./instructions";
import RootLayout from "./layout";
import { CopilotKit } from "@copilotkit/react-core"

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showSpreadsheet, setShowSpreadsheet] = useState(false);
  const [isLangraph, setIsLangraph] = useState(true);

  const runtimeUrl = isLangraph ? "/api/copilotkit/langraph" : "/api/copilotkit/crewai";
  const agent = isLangraph ? "sample_agent" : "crewai_sample_agent";

  return (
    <div className="min-h-screen bg-gray-50 flex relative">
      {/* Client component that sets up the Copilot action handler */}
      <CopilotActionHandler />
      <CopilotKit
        runtimeUrl={runtimeUrl}
        agent={agent}
        showDevConsole={true}
      >

      {/* Main content area */}
      <div className="flex-1 p-4 md:p-8 lg:mr-[30vw]">
        <MCPConfigForm showSpreadsheet={showSpreadsheet}
          setShowSpreadsheet={setShowSpreadsheet}
          isLangraph={isLangraph}
          setIsLangraph={setIsLangraph} />
        {showSpreadsheet && <SpreadsheetRenderer />}
      </div>
      {/* Mobile chat toggle button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-4 right-4 z-50 p-3 bg-gray-800 text-white rounded-full shadow-lg lg:hidden hover:bg-gray-700"
        aria-label="Toggle chat"
      >
        {isChatOpen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        )}
      </button>

      {/* Fixed sidebar - hidden on mobile, shown on larger screens */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-[80vw] lg:w-[30vw] border-l bg-white shadow-md transition-transform duration-300 ${
          isChatOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
        style={
          {
            "--copilot-kit-primary-color": "#4F4F4F",
          } as CopilotKitCSSProperties
        }
      >
        <CopilotChat
          className="h-full flex flex-col"
          // instructions={
          //   "You are assisting the user as best as you can. Answer in the best way possible given the data you have."
          // }
          instructions={INSTRUCTIONS}
          labels={{
            title: "MCP Assistant",
            initial: "Need any help?",
          }}
        />
      </div>
      </CopilotKit>
    </div>
  );
}

// CopilotContext.tsx
"use client";

import { createContext, useContext, ReactNode } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";

interface CopilotContextType {
  isLangraph: boolean;
  setIsLangraph: (value: boolean) => void;
  runtimeUrl: string;
  agent: string;
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

export function CopilotProvider({ children }: { children: ReactNode }) {
  const [isLangraph, setIsLangraph] = useLocalStorage<boolean>("isLangraph", true);
  const runtimeUrl = isLangraph ? "/api/copilotkit/langgraph" : "/api/copilotkit/crewai";
  const agent = isLangraph ? "sample_agent" : "crewai_sample_agent";

  return (
    <CopilotContext.Provider value={{ isLangraph, setIsLangraph, runtimeUrl, agent }}>
      {children}
    </CopilotContext.Provider>
  );
}

export function useCopilotContext() {
  const context = useContext(CopilotContext);
  if (!context) {
    throw new Error("useCopilotContext must be used within a CopilotProvider");
  }
  return context;
}

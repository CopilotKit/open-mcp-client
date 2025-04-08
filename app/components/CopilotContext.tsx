// CopilotContext.tsx
"use client";

import { createContext, useContext, ReactNode } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";

interface CopilotContextType {
  isLanggraph: boolean;
  setIsLanggraph: (value: boolean) => void;
  runtimeUrl: string;
  agent: string;
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

export function CopilotProvider({ children }: { children: ReactNode }) {
  const [isLanggraph, setIsLanggraph] = useLocalStorage<boolean>("isLanggraph", true);
  const runtimeUrl = isLanggraph ? "/api/copilotkit/langgraph" : "/api/copilotkit/crewai";
  const agent = isLanggraph ? "sample_agent" : "crewai_sample_agent";

  return (
    <CopilotContext.Provider value={{ isLanggraph, setIsLanggraph, runtimeUrl, agent }}>
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

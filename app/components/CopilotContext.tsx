// CopilotContext.tsx
"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface CopilotContextType {
  isLangraph: boolean;
  setIsLangraph: (value: boolean) => void;
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

export function CopilotProvider({ children }: { children: ReactNode }) {
  const [isLangraph, setIsLangraph] = useState(true);

  return (
    <CopilotContext.Provider value={{ isLangraph, setIsLangraph }}>
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

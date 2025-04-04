// layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@copilotkit/react-ui/styles.css";
import { CopilotKit } from "@copilotkit/react-core";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Open MCP Client",
  description: "An open source MCP client built with CopilotKit 🪁",
};

export default function RootLayout({
  children,
  isLangraph,
}: Readonly<{
  children: React.ReactNode;
  isLangraph?: boolean;
}>) {
  // Default to true if isLangraph isn't provided (for server-side rendering)
  const runtimeUrl = isLangraph !== false ? "/api/copilotkit/langraph" : "/api/copilotkit/crewai";
  const agent = isLangraph !== false ? "sample_agent" : "crewai_sample_agent";

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased w-screen h-screen`}
      >
        <CopilotKit
          runtimeUrl={runtimeUrl}
          agent={agent}
          showDevConsole={true}
        >
          {children}
        </CopilotKit>
      </body>
    </html>
  );
}
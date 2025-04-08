import {
    CopilotRuntime,
    copilotRuntimeNextJSAppRouterEndpoint,
    langGraphPlatformEndpoint,
    LangChainAdapter,
} from "@copilotkit/runtime";
import { NextRequest } from "next/server";
import { ChatOpenAI } from "@langchain/openai";

// Service adapter for LangChain
const serviceAdapter = new LangChainAdapter({
    chainFn: async ({ messages, tools }) => {
        return model.bindTools(tools, { strict: true }).stream(messages);
    },
});

const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0,
    apiKey: process.env["OPENAI_API_KEY"],
});

// Create runtime with only LangGraph endpoint
const runtime = new CopilotRuntime({
    remoteEndpoints: [
        langGraphPlatformEndpoint({
            deploymentUrl: `${process.env.AGENT_DEPLOYMENT_URL || "http://localhost:8123"}`,
            langsmithApiKey: process.env.LANGSMITH_API_KEY,
            agents: [
                {
                    name: "sample_agent",
                    description: "A helpful LLM agent.",
                },
            ],
        }),
    ],
});

export const POST = async (req: NextRequest) => {
    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
        runtime,
        serviceAdapter,
        endpoint: "/api/copilotkit/langgraph",
    });

    return handleRequest(req);
};
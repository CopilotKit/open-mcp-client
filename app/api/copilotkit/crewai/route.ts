import {
    CopilotRuntime,
    copilotRuntimeNextJSAppRouterEndpoint,
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

// Create runtime with only CrewAI endpoint
const runtime = new CopilotRuntime({
    remoteEndpoints: [
        {
            url: process.env.REMOTE_ACTION_URL || "http://localhost:8000/copilotkit",
        },
    ],
});

export const POST = async (req: NextRequest) => {
    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
        runtime,
        serviceAdapter,
        endpoint: "/api/copilotkit/crewai",
    });

    return handleRequest(req);
};
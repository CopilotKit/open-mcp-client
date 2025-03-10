https://github.com/user-attachments/assets/f72e1f7d-3c84-4429-a465-23dff3d3bd63


# Getting Started

## Set Up Environment Variables:

```sh
touch .env
```

Add the following inside `.env` at the root:

```sh
LANGSMITH_API_KEY=lsv2_...
```

Next, create another `.env` file inside the `agent` folder:

```sh
cd agent
touch .env
```

Add the following inside `agent/.env`:

```sh
OPENAI_API_KEY=sk-...
LANGSMITH_API_KEY=lsv2_...
```

## Development

We recommend running the **frontend and agent separately** in different terminals to debug errors and logs:

```bash
# Terminal 1 - Frontend
pnpm run dev-frontend

# Terminal 2 - Agent
pnpm run dev-agent
```

Alternatively, you can run both services together with:

```bash
pnpm run dev
```

Then, open [http://localhost:3000](http://localhost:3000) in your browser.

## Architecture

The codebase is split into two main parts:

1. `/agent` **folder** – A LangGraph agent that connects to MCP servers and calls their tools.
2. `/app` **folder** – A frontend application using CopilotKit for UI and state synchronization.

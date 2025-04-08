https://github.com/user-attachments/assets/dfce1a40-3e9a-46f5-a066-a4cc496ed9e1


# Getting Started

## Set Up Environment Variables:

```sh
touch .env
```

Add the following inside `.env` at the root:

```sh
LANGSMITH_API_KEY=lsv2_...
OPENAI_API_KEY=sk-...
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

## Set Up Poetry:

Poetry is used for dependency management in the agent service. To install Poetry, run:

```sh
pip install poetry
```

To verify the installation, run:

```sh
poetry --version
```

## Development

We recommend you run the frontend, LangGraph agent, and CrewAI agent separately in different terminals for better debugging and log visibility:

```bash
# Terminal 1 - Frontend
pnpm run dev-frontend

# Terminal 2 - LangGraph Agent
pnpm run dev-agent

# Terminal 3 - CrewAI Agent
poetry run demo
```

Alternatively, you can run both the frontend and LangGraph agent together with:

```bash
pnpm run dev
```

Then, open [http://localhost:3000](http://localhost:3000) in your browser.


## Architecture
The codebase is split into three main parts:

1. `/agent/sample_agent` **folder** – A LangGraph agent that connects to MCP servers and calls their tools.

2. `/agent/crewai_sample_agent` **folder** – A CrewAI agent that connects to MCP servers and calls their tools.

3. `/app`  **folder** – A frontend application using CopilotKit for UI and state synchronization.


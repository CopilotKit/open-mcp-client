# Docker Setup

This project combines a Next.js frontend and a Python langgraph agent.

## Quick Start

```bash
# Start both applications
docker compose up

# Rebuild and start
docker compose build && docker compose up

# Run in background
docker compose up -d

# Stop containers
docker compose down

```

## Access Points

- Frontend: http://localhost:3000
- Agent: http://localhost:8123

## Logs

```bash
# All services
docker compose logs

# Specific service
docker compose logs frontend
docker compose logs agent

# Follow logs
docker compose logs -f
```

## Troubleshooting

The agent container auto-restarts up to 5 times if it fails.
Check logs with `docker compose logs agent`.
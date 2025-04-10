# syntax=docker/dockerfile:1

# Frontend and agent in a single Dockerfile with multiple stages

# Version variables
ARG NODE_VERSION=22.14.0
ARG PNPM_VERSION=9.0.6
ARG PYTHON_VERSION=3.11

################################################################################
# Base stage for frontend (Next.js)
FROM node:${NODE_VERSION}-alpine as frontend-base

# Working directory
WORKDIR /usr/src/app

# Install pnpm
RUN --mount=type=cache,target=/root/.npm \
    npm install -g pnpm@${PNPM_VERSION}

################################################################################
# Production dependencies for frontend
FROM frontend-base as frontend-deps

# Download dependencies
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --prod --frozen-lockfile

################################################################################
# Build stage for frontend
FROM frontend-deps as frontend-build

# Install all dependencies including dev
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy source files
COPY . .
# Build the application
RUN pnpm run build

################################################################################
# Final stage for frontend
FROM frontend-base as frontend-final

# Configure Node.js for production
ENV NODE_ENV production

# Run as non-root user
USER node

# Copy package.json
COPY package.json .

# Copy dependencies and compiled files
COPY --from=frontend-deps /usr/src/app/node_modules ./node_modules
COPY --from=frontend-build /usr/src/app/.next ./.next
COPY --from=frontend-build /usr/src/app/public ./public

# Expose port
EXPOSE 3000

# Command to run the application
CMD pnpm start

################################################################################
# Base stage for agent (Python)
FROM python:${PYTHON_VERSION}-slim as agent-base

# Install system dependencies
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install poetry

# Configure Poetry to not create virtual environments
RUN poetry config virtualenvs.create false

# Working directory
WORKDIR /usr/src/app/agent

################################################################################
# Dependencies stage for agent
FROM agent-base as agent-deps

# Copy Poetry configuration files
COPY agent/pyproject.toml ./

# Regenerate the lock file first
RUN poetry lock

# Install dependencies without installing the project itself
RUN poetry install --no-interaction --no-ansi --no-root

# Explicitly install langgraph-api package
RUN pip install "langgraph-cli[inmem]" langgraph-api

################################################################################
# Final stage for agent
FROM agent-deps as agent-final

# Copy agent source code
COPY agent/ ./

# Expose port
EXPOSE 8123

# Command to run the agent
CMD poetry run langgraph dev --host 0.0.0.0 --port 8123 --no-browser

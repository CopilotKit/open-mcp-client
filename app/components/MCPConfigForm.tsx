"use client";

import { useState, useEffect } from "react";
import { useCoAgent } from "@copilotkit/react-core";
import { ExampleConfigs } from "./ExampleConfigs";
import {
  PlusCircle,
  Trash2,
  X,
  Server,
  Terminal,
  Globe,
  ChevronDown,
  ExternalLink,
  Save,
} from "lucide-react";

type ConnectionType = "stdio" | "sse";

interface StdioConfig {
  command: string;
  args: string[];
  transport: "stdio";
}

interface SSEConfig {
  url: string;
  transport: "sse";
}

type ServerConfig = StdioConfig | SSEConfig;

// LocalStorage key
const STORAGE_KEY = "mcp-storage-v3";

export function MCPConfigForm() {
  // Load configs once using initializer function
  const [configs, setConfigs] = useState<Record<string, ServerConfig>>(() => {
    // Only run on client side
    if (typeof window === "undefined") return {};

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Failed to load from localStorage:", e);
      return {};
    }
  });

  const [serverName, setServerName] = useState("");
  const [connectionType, setConnectionType] = useState<ConnectionType>("stdio");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [url, setUrl] = useState("");
  const [showAddServerForm, setShowAddServerForm] = useState(false);
  const [showExampleConfigs, setShowExampleConfigs] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Set up coagent
  const { setState } = useCoAgent({
    name: "sample_agent",
    initialState: {
      mcp_config: {},
    },
  });

  // Set isClient after mount
  useEffect(() => {
    setIsClient(true);

    // Update agent with initial configs
    setState({ mcp_config: configs });
  }, []);

  // Calculate server statistics
  const totalServers = Object.keys(configs).length;
  const stdioServers = Object.values(configs).filter(
    (config) => config.transport === "stdio"
  ).length;
  const sseServers = Object.values(configs).filter(
    (config) => config.transport === "sse"
  ).length;

  // Manual save function
  const saveConfigs = () => {
    if (typeof window === "undefined") return;

    try {
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));

      // Update agent state
      setState({ mcp_config: configs });

      alert(`Saved ${totalServers} configurations successfully!`);
    } catch (e) {
      console.error("Failed to save:", e);
      alert("Failed to save configurations");
    }
  };

  const handleExampleConfig = (exampleConfig: Record<string, ServerConfig>) => {
    if (Object.keys(configs).length > 0) {
      const shouldReplace = window.confirm(
        "Do you want to replace your current configuration with this example? Click 'OK' to replace, or 'Cancel' to merge."
      );

      if (shouldReplace) {
        setConfigs(exampleConfig);
      } else {
        setConfigs((prev) => ({ ...prev, ...exampleConfig }));
      }
    } else {
      setConfigs(exampleConfig);
    }

    setShowExampleConfigs(false);
  };

  const addConfig = () => {
    if (!serverName) return;

    const newConfig =
      connectionType === "stdio"
        ? {
            command,
            args: args.split(" ").filter((arg) => arg.trim() !== ""),
            transport: "stdio" as const,
          }
        : {
            url,
            transport: "sse" as const,
          };

    setConfigs((prev) => ({
      ...prev,
      [serverName]: newConfig,
    }));

    // Reset form
    setServerName("");
    setCommand("");
    setArgs("");
    setUrl("");
    setShowAddServerForm(false);
  };

  const removeConfig = (name: string) => {
    setConfigs((prev) => {
      const newConfigs = { ...prev };
      delete newConfigs[name];
      return newConfigs;
    });
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Server className="h-8 w-8 mr-3" />
          <h1 className="text-4xl font-bold">chat-mcp-langgraph</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={saveConfigs}
            className="px-3 py-1.5 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-500 flex items-center gap-1"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
          <button
            onClick={() => setShowAddServerForm(true)}
            className="px-3 py-1.5 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700 flex items-center gap-1"
          >
            <PlusCircle className="h-4 w-4" />
            Add Server
          </button>
        </div>
      </div>

      {/* Warning about manual saving */}
      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-sm">
        <strong>Note:</strong> You must click the "Save" button to persist your
        changes to localStorage. Changes will be lost if you refresh without
        saving.
      </div>

      {/* Debug Info */}
      {isClient && (
        <div className="mb-4 p-2 bg-gray-100 text-xs font-mono overflow-auto max-h-32 rounded-md">
          <p>Current configuration:</p>
          <pre>{JSON.stringify(configs, null, 2)}</pre>
        </div>
      )}

      {/* Server Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border rounded-md p-4">
          <div className="text-sm text-gray-500">Total Servers</div>
          <div className="text-3xl font-bold">{totalServers}</div>
        </div>
        <div className="bg-white border rounded-md p-4">
          <div className="text-sm text-gray-500">Stdio Servers</div>
          <div className="text-3xl font-bold">{stdioServers}</div>
        </div>
        <div className="bg-white border rounded-md p-4">
          <div className="text-sm text-gray-500">SSE Servers</div>
          <div className="text-3xl font-bold">{sseServers}</div>
        </div>
      </div>

      {/* Example Configs Button */}
      <div className="mb-4">
        <button
          onClick={() => setShowExampleConfigs(!showExampleConfigs)}
          className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <span>Example Configurations</span>
          <ChevronDown
            className={`w-4 h-4 ml-1 transition-transform ${
              showExampleConfigs ? "rotate-180" : ""
            }`}
          />
        </button>

        {showExampleConfigs && (
          <div className="mt-2">
            <ExampleConfigs onSelectConfig={handleExampleConfig} />
          </div>
        )}
      </div>

      {/* Server List */}
      <div className="bg-white border rounded-md p-6">
        <h2 className="text-lg font-semibold mb-4">Server List</h2>

        {totalServers === 0 ? (
          <div className="text-gray-500 text-center py-10">
            No servers configured. Click "Add Server" to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(configs).map(([name, config]) => (
              <div
                key={name}
                className="border rounded-md overflow-hidden bg-white shadow-sm"
              >
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{name}</h3>
                      <div className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-xs rounded mt-1">
                        {config.transport === "stdio" ? (
                          <Terminal className="w-3 h-3 mr-1" />
                        ) : (
                          <Globe className="w-3 h-3 mr-1" />
                        )}
                        {config.transport}
                      </div>
                    </div>
                    <button
                      onClick={() => removeConfig(name)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    {config.transport === "stdio" ? (
                      <>
                        <p>Command: {config.command}</p>
                        <p className="truncate">
                          Args: {config.args.join(" ")}
                        </p>
                      </>
                    ) : (
                      <p className="truncate">URL: {config.url}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Composio reference */}
        <div className="mt-10 pt-4 border-t text-center text-sm text-gray-500">
          More MCP servers available on the web, e.g.{" "}
          <a
            href="https://mcp.composio.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-700 hover:text-gray-900 inline-flex items-center"
          >
            mcp.composio.dev <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>
      </div>

      {/* Add Server Modal */}
      {showAddServerForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center">
                <PlusCircle className="w-5 h-5 mr-2" />
                Add New Server
              </h2>
              <button
                onClick={() => setShowAddServerForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Server Name
                </label>
                <input
                  type="text"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  placeholder="e.g., api-service, data-processor"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Connection Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConnectionType("stdio")}
                    className={`px-3 py-2 border rounded-md text-center flex items-center justify-center ${
                      connectionType === "stdio"
                        ? "bg-gray-200 border-gray-400 text-gray-800"
                        : "bg-white text-gray-700"
                    }`}
                  >
                    <Terminal className="w-4 h-4 mr-1" />
                    Standard IO
                  </button>
                  <button
                    type="button"
                    onClick={() => setConnectionType("sse")}
                    className={`px-3 py-2 border rounded-md text-center flex items-center justify-center ${
                      connectionType === "sse"
                        ? "bg-gray-200 border-gray-400 text-gray-800"
                        : "bg-white text-gray-700"
                    }`}
                  >
                    <Globe className="w-4 h-4 mr-1" />
                    SSE
                  </button>
                </div>
              </div>

              {connectionType === "stdio" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Command
                    </label>
                    <input
                      type="text"
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      placeholder="e.g., python, node"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Arguments
                    </label>
                    <input
                      type="text"
                      value={args}
                      onChange={(e) => setArgs(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      placeholder="e.g., path/to/script.py"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">URL</label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    placeholder="e.g., http://localhost:8000/events"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setShowAddServerForm(false)}
                  className="px-4 py-2 border text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium flex items-center"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </button>
                <button
                  onClick={addConfig}
                  className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 text-sm font-medium flex items-center"
                >
                  <PlusCircle className="w-4 h-4 mr-1" />
                  Add Server
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

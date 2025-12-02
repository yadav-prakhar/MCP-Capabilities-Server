#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema,
  LATEST_PROTOCOL_VERSION,
} from "@modelcontextprotocol/sdk/types.js";

// Store the client's protocol version when initialized
let clientProtocolVersion: string | undefined;

const server = new Server(
  {
    name: "mcp-version-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Capture client protocol version during initialization
server.setRequestHandler(InitializeRequestSchema, async (request) => {
  clientProtocolVersion = request.params.protocolVersion;
  
  return {
    protocolVersion: LATEST_PROTOCOL_VERSION,
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: "mcp-version-server",
      version: "1.0.0",
    },
  };
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_protocol_version",
        description: "Returns the MCP protocol version being used by the client",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_protocol_version") {
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              clientProtocolVersion: clientProtocolVersion || "unknown",
              message: `MCP Protocol Version: ${clientProtocolVersion || "unknown"}`,
              latestSDKProtocolVersion: LATEST_PROTOCOL_VERSION,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Version Server running on stdio");
}

main().catch(console.error);

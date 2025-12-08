#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema,
  LATEST_PROTOCOL_VERSION,
} from "@modelcontextprotocol/sdk/types.js";
import type { ClientCapabilities, Implementation } from "@modelcontextprotocol/sdk/types.js";

// Store the client's information when initialized
let clientProtocolVersion: string | undefined;
let clientCapabilities: ClientCapabilities | undefined;
let clientInfo: Implementation | undefined;

// Helper interface for capability status
interface CapabilityStatus {
  capability: string;
  description: string;
  status: "Enabled" | "Disabled";
  details?: string;
}

// Generate markdown table of client capabilities
function generateCapabilitiesMarkdownTable(
  capabilities: ClientCapabilities | undefined
): string {
  if (!capabilities) {
    return "No client capabilities available - client has not connected yet.";
  }

  const capabilityStatuses: CapabilityStatus[] = [
    // Roots capability
    {
      capability: "Roots",
      description: "Client can provide root directories/files for server operations",
      status: capabilities.roots ? "Enabled" : "Disabled",
      details: capabilities.roots?.listChanged
        ? "listChanged notifications supported"
        : undefined,
    },
    // Sampling capability
    {
      capability: "Sampling",
      description: "Client supports LLM sampling requests from server",
      status: capabilities.sampling ? "Enabled" : "Disabled",
      details: [
        capabilities.sampling?.context ? "context inclusion" : null,
        capabilities.sampling?.tools ? "tool use" : null,
      ]
        .filter(Boolean)
        .join(", ") || undefined,
    },
    // Elicitation capability
    {
      capability: "Elicitation",
      description: "Client supports user input elicitation from server",
      status: capabilities.elicitation ? "Enabled" : "Disabled",
      details: [
        capabilities.elicitation?.form ? "form mode" : null,
        capabilities.elicitation?.url ? "URL mode" : null,
      ]
        .filter(Boolean)
        .join(", ") || undefined,
    },
    // Experimental capabilities
    {
      capability: "Experimental",
      description: "Non-standard experimental capabilities",
      status:
        capabilities.experimental &&
        Object.keys(capabilities.experimental).length > 0
          ? "Enabled"
          : "Disabled",
      details: capabilities.experimental
        ? Object.keys(capabilities.experimental).join(", ")
        : undefined,
    },
  ];

  // Build markdown table
  let table = "## Client Capabilities\n\n";
  table += "| Capability | Status | Description | Details |\n";
  table += "|------------|--------|-------------|----------|\n";

  for (const cap of capabilityStatuses) {
    const details = cap.details || "-";
    table += `| ${cap.capability} | ${cap.status} | ${cap.description} | ${details} |\n`;
  }

  return table;
}

const server = new Server(
  {
    name: "mcp-capabilities-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Capture client information during initialization
server.setRequestHandler(InitializeRequestSchema, async (request) => {
  clientProtocolVersion = request.params.protocolVersion;
  clientCapabilities = request.params.capabilities;
  clientInfo = request.params.clientInfo;

  return {
    protocolVersion: LATEST_PROTOCOL_VERSION,
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: "mcp-capabilities-server",
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
      {
        name: "get_client_capabilities",
        description:
          "Returns a markdown table showing which MCP capabilities the connected client supports (roots, sampling, elicitation, experimental)",
        inputSchema: {
          type: "object",
          properties: {
            format: {
              type: "string",
              enum: ["markdown", "json"],
              description:
                "Output format: 'markdown' for a readable table, 'json' for raw capability data",
            },
          },
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
              latestSDKProtocolVersion: LATEST_PROTOCOL_VERSION,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (request.params.name === "get_client_capabilities") {
    const format =
      (request.params.arguments?.format as string) || "markdown";

    if (format === "json") {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                clientInfo: clientInfo || null,
                capabilities: clientCapabilities || null,
                protocolVersion: clientProtocolVersion || "unknown",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Default: markdown format
    const markdownTable = generateCapabilitiesMarkdownTable(clientCapabilities);

    let output = `# MCP Client Information\n\n`;
    output += `**Client Name:** ${clientInfo?.name || "Unknown"}\n`;
    output += `**Client Version:** ${clientInfo?.version || "Unknown"}\n`;
    output += `**Protocol Version:** ${clientProtocolVersion || "Unknown"}\n\n`;
    output += markdownTable;

    return {
      content: [
        {
          type: "text",
          text: output,
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Capabilities Server running on stdio");
}

main().catch(console.error);

#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type {
  CallToolResult,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";

async function main() {
  const client = new Client(
    { name: "version-client", version: "1.0.0" },
    {
      capabilities: {
        sampling: {
          tools: {},
        },
      },
    }
  );

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const serverEntry = path.resolve(__dirname, "./index.js");

  const sanitizedEnv: Record<string, string> = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  );

  const transport = new StdioClientTransport({
    command: "node",
    args: [serverEntry],
    env: sanitizedEnv,
    stderr: "inherit",
  });

  await client.connect(transport);

  const toolResponse = await client.callTool({
    name: "get_protocol_version",
    arguments: {},
  });

  if ("content" in toolResponse) {
    const toolResult = toolResponse as CallToolResult;
    const textBlock = toolResult.content.find(
      (block): block is TextContent => block.type === "text"
    );

    if (textBlock) {
      console.log(textBlock.text);
    } else if (toolResult.structuredContent) {
      console.log(JSON.stringify(toolResult.structuredContent, null, 2));
    } else {
      console.log(JSON.stringify(toolResult, null, 2));
    }
  } else {
    console.log(JSON.stringify(toolResponse, null, 2));
  }

  await client.close();
  await transport.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

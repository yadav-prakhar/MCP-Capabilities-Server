import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import type { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types.js";

describe("MCP Capabilities Server", () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const serverEntry = path.resolve(__dirname, "../dist/index.js");

    client = new Client(
      { name: "test-client", version: "1.0.0" },
      {
        capabilities: {
          sampling: { tools: {}, context: {} },
          roots: { listChanged: true },
          elicitation: { form: {}, url: {} },
        },
      }
    );

    const sanitizedEnv: Record<string, string> = Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] => entry[1] !== undefined
      )
    );

    transport = new StdioClientTransport({
      command: "node",
      args: [serverEntry],
      env: sanitizedEnv,
      stderr: "inherit",
    });

    await client.connect(transport);
  });

  afterAll(async () => {
    await client.close();
    await transport.close();
  });

  describe("get_protocol_version tool", () => {
    it("should return protocol version information", async () => {
      const response = (await client.callTool({
        name: "get_protocol_version",
        arguments: {},
      })) as CallToolResult;

      const textContent = response.content.find(
        (c): c is TextContent => c.type === "text"
      );
      expect(textContent).toBeDefined();

      const parsed = JSON.parse(textContent!.text);
      expect(parsed).toHaveProperty("clientProtocolVersion");
      expect(parsed).toHaveProperty("latestSDKProtocolVersion");
      expect(parsed).toHaveProperty("message");
    });
  });

  describe("get_client_capabilities tool", () => {
    it("should return client capabilities in markdown format", async () => {
      const response = (await client.callTool({
        name: "get_client_capabilities",
        arguments: { format: "markdown" },
      })) as CallToolResult;

      const textContent = response.content.find(
        (c): c is TextContent => c.type === "text"
      );
      expect(textContent).toBeDefined();
      expect(textContent!.text).toContain("## Client Capabilities");
      expect(textContent!.text).toContain("| Capability |");
      expect(textContent!.text).toContain("Sampling");
      expect(textContent!.text).toContain("Roots");
      expect(textContent!.text).toContain("Elicitation");
      expect(textContent!.text).toContain("Enabled");
    });

    it("should return client capabilities in JSON format", async () => {
      const response = (await client.callTool({
        name: "get_client_capabilities",
        arguments: { format: "json" },
      })) as CallToolResult;

      const textContent = response.content.find(
        (c): c is TextContent => c.type === "text"
      );
      expect(textContent).toBeDefined();

      const parsed = JSON.parse(textContent!.text);
      expect(parsed).toHaveProperty("clientInfo");
      expect(parsed).toHaveProperty("capabilities");
      expect(parsed).toHaveProperty("protocolVersion");
      expect(parsed.capabilities.sampling).toBeDefined();
      expect(parsed.capabilities.roots).toBeDefined();
      expect(parsed.capabilities.elicitation).toBeDefined();
    });

    it("should default to markdown format when format not specified", async () => {
      const response = (await client.callTool({
        name: "get_client_capabilities",
        arguments: {},
      })) as CallToolResult;

      const textContent = response.content.find(
        (c): c is TextContent => c.type === "text"
      );
      expect(textContent).toBeDefined();
      expect(textContent!.text).toContain("## Client Capabilities");
      expect(textContent!.text).toContain("| Capability |");
    });

    it("should include client information in markdown output", async () => {
      const response = (await client.callTool({
        name: "get_client_capabilities",
        arguments: { format: "markdown" },
      })) as CallToolResult;

      const textContent = response.content.find(
        (c): c is TextContent => c.type === "text"
      );
      expect(textContent).toBeDefined();
      expect(textContent!.text).toContain("**Client Name:**");
      expect(textContent!.text).toContain("**Client Version:**");
      expect(textContent!.text).toContain("**Protocol Version:**");
      expect(textContent!.text).toContain("test-client");
    });

    it("should show correct capability status", async () => {
      const response = (await client.callTool({
        name: "get_client_capabilities",
        arguments: { format: "markdown" },
      })) as CallToolResult;

      const textContent = response.content.find(
        (c): c is TextContent => c.type === "text"
      );
      expect(textContent).toBeDefined();

      const text = textContent!.text;
      // Sampling should be enabled with details
      expect(text).toMatch(/Sampling.*Enabled.*context inclusion.*tool use/s);
      // Roots should be enabled
      expect(text).toMatch(/Roots.*Enabled.*listChanged/s);
      // Elicitation should be enabled (case-insensitive for URL)
      expect(text).toMatch(/Elicitation.*Enabled.*form mode.*URL mode/s);
      // Experimental should be disabled
      expect(text).toMatch(/Experimental.*Disabled/s);
    });
  });
});

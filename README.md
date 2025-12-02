# MCP Version Server

An MCP (Model Context Protocol) server that outputs the protocol version being used.

## Installation

```bash
npm install
```

## Build

```bash
npm run build
```

## Usage

This server communicates over stdio. To use it with an MCP client, add it to your MCP configuration:

```json
{
  "mcpServers": {
    "version-server": {
      "command": "node",
      "args": ["/path/to/mcp-version-server/dist/index.js"]
    }
  }
}
```

## Available Tools

### `get_protocol_version`

Returns the MCP protocol version information including:
- **serverProtocolVersion**: The protocol version the server supports
- **clientProtocolVersion**: The protocol version sent by the client during initialization
- **message**: A human-readable message with the version


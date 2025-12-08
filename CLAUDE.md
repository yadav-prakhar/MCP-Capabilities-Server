# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that exposes the protocol version being used. It demonstrates MCP server/client communication patterns using the official `@modelcontextprotocol/sdk`.

## Commands

- `npm run build` - Compile TypeScript to JavaScript (outputs to `dist/`)
- `npm run start` - Run the compiled server
- `npm test` - Run tests with Vitest
- `npm test -- --run` - Run tests once without watch mode
- `npm run test:client` - Build and run the sample client to test the server end-to-end

## Architecture

**Server (`src/index.ts`)**: MCP server using stdio transport that:
- Captures client protocol version during initialization handshake
- Exposes a `get_protocol_version` tool that returns version information
- Handlers are registered via `server.setRequestHandler()` with schema validators

**Sample Client (`test/sampleClient/getVersion.ts`)**: MCP client that spawns the server as a subprocess and calls the `get_protocol_version` tool. Useful for testing the server end-to-end.

## Key Patterns

- Uses ESM modules (`"type": "module"` in package.json)
- MCP SDK imports use `.js` extensions (e.g., `@modelcontextprotocol/sdk/server/index.js`)
- Server communicates via stdio, suitable for MCP client configurations

#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

const server = createServer();
await server.connect(new StdioServerTransport());
// stdout is the protocol channel; log only to stderr.
console.error('webhook-crash-lab MCP server running on stdio');

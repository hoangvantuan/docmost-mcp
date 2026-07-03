#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { AxiosError } from "axios";
import { DocmostClient, getOrCreateClient } from "./services/api-client.js";
import { registerPageTools } from "./tools/pages.js";
import { registerSpaceTools } from "./tools/spaces.js";
import { registerCommentTools } from "./tools/comments.js";
import { registerUserTools } from "./tools/users.js";
import { registerWorkspaceTools } from "./tools/workspace.js";
import { registerGroupTools } from "./tools/groups.js";

function createServer(client: DocmostClient): McpServer {
  const server = new McpServer({
    name: "docmost-mcp-server",
    version: "1.3.0",
  });

  registerPageTools(server, client);
  registerSpaceTools(server, client);
  registerCommentTools(server, client);
  registerUserTools(server, client);
  registerWorkspaceTools(server, client);
  registerGroupTools(server, client);

  return server;
}

async function runStdio(): Promise<void> {
  const url = process.env.DOCMOST_URL;
  const email = process.env.DOCMOST_EMAIL;
  const password = process.env.DOCMOST_PASSWORD;

  if (!url || !email || !password) {
    console.error("ERROR: DOCMOST_URL, DOCMOST_EMAIL, DOCMOST_PASSWORD are required for stdio mode.");
    process.exit(1);
  }

  const client = await DocmostClient.create(url, email, password);
  console.error("Authenticated with Docmost");

  const server = createServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Docmost MCP server running via stdio");
}

async function runHttp(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.post("/mcp", async (req, res) => {
    const url = req.headers["x-docmost-url"] as string | undefined;
    const email = req.headers["x-docmost-email"] as string | undefined;
    const password = req.headers["x-docmost-password"] as string | undefined;

    if (!url || !email || !password) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "Missing required headers: X-Docmost-Url, X-Docmost-Email, X-Docmost-Password",
        },
        id: null,
      });
      return;
    }

    try {
      const client = await getOrCreateClient(url, email, password);
      const server = createServer(client);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      res.on("close", () => transport.close());
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      let detail = error instanceof Error ? error.message : String(error);
      if (error instanceof AxiosError && error.response) {
        detail = `HTTP ${error.response.status} from ${error.config?.url}: ${JSON.stringify(error.response.data)}`;
      }
      console.error("Auth error:", detail);
      res.status(401).json({
        jsonrpc: "2.0",
        error: { code: -32600, message: `Authentication failed: ${detail}` },
        id: null,
      });
    }
  });

  app.get("/mcp", (_req, res) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "SSE not supported in stateless mode. Use POST." },
      id: null,
    });
  });

  app.delete("/mcp", (_req, res) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Session termination not supported in stateless mode." },
      id: null,
    });
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", server: "docmost-mcp-server", version: "1.3.0" });
  });

  const port = parseInt(process.env.PORT || "3001", 10);
  app.listen(port, () => {
    console.error(`Docmost MCP server running on http://localhost:${port}/mcp`);
    console.error("Credentials via headers: X-Docmost-Url, X-Docmost-Email, X-Docmost-Password");
  });
}

async function main(): Promise<void> {
  const transport = process.env.TRANSPORT || "stdio";
  if (transport === "http") {
    await runHttp();
  } else {
    await runStdio();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

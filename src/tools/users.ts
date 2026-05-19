/**
 * User tools for Docmost MCP Server.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DocmostClient, handleApiError } from "../services/api-client.js";

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(error: unknown) {
  return { content: [{ type: "text" as const, text: handleApiError(error) }], isError: true as const };
}

export function registerUserTools(server: McpServer, client: DocmostClient): void {
  server.registerTool("docmost_get_current_user", {
    title: "Get Current User",
    description: "Get info about the authenticated user and their workspace.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async () => {
    try {
      return textResult(await client.request("/users/me"));
    } catch (error) { return errorResult(error); }
  });
}

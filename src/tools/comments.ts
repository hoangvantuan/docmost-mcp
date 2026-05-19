/**
 * Comment tools for Docmost MCP Server.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DocmostClient, handleApiError } from "../services/api-client.js";
import { DEFAULT_LIMIT, MAX_LIMIT } from "../constants.js";

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(error: unknown) {
  return { content: [{ type: "text" as const, text: handleApiError(error) }], isError: true as const };
}

function msgResult(msg: string) {
  return { content: [{ type: "text" as const, text: msg }] };
}

export function registerCommentTools(server: McpServer, client: DocmostClient): void {
  server.registerTool("docmost_get_comments", {
    title: "Get Page Comments",
    description: "List all comments on a page.",
    inputSchema: {
      pageId: z.string().min(1).describe("Page ID"),
      limit: z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT).describe("Max results"),
      page: z.number().int().min(1).default(1).describe("Page number"),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      return textResult(await client.request("/comments/", { pageId: params.pageId, limit: params.limit, page: params.page }));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_get_comment", {
    title: "Get Comment",
    description: "Get a specific comment by its ID.",
    inputSchema: {
      commentId: z.string().uuid().describe("Comment ID"),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      return textResult(await client.request("/comments/info", { commentId: params.commentId }));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_create_comment", {
    title: "Create Comment",
    description: "Add a comment to a page. Content must be a JSON string (TipTap/ProseMirror format).",
    inputSchema: {
      pageId: z.string().min(1).describe("Page ID to comment on"),
      content: z.string().describe("Comment content as JSON (TipTap doc format)"),
      type: z.enum(["page", "inline"]).default("page").describe("Comment type"),
      parentCommentId: z.string().uuid().optional().describe("Parent comment ID for replies"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, async (params) => {
    try {
      const body: Record<string, unknown> = {
        pageId: params.pageId,
        content: params.content,
        type: params.type,
      };
      if (params.parentCommentId) body.parentCommentId = params.parentCommentId;
      return textResult(await client.request("/comments/create", body));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_update_comment", {
    title: "Update Comment",
    description: "Update an existing comment's content. Content must be JSON (TipTap/ProseMirror format).",
    inputSchema: {
      commentId: z.string().uuid().describe("Comment ID to update"),
      content: z.string().describe("New comment content as JSON (TipTap doc format)"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      return textResult(await client.request("/comments/update", { commentId: params.commentId, content: params.content }));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_delete_comment", {
    title: "Delete Comment",
    description: "Delete a comment. Only the comment owner or space admin can delete.",
    inputSchema: {
      commentId: z.string().uuid().describe("Comment ID to delete"),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  }, async (params) => {
    try {
      await client.request("/comments/delete", { commentId: params.commentId });
      return msgResult(`Comment ${params.commentId} deleted.`);
    } catch (error) { return errorResult(error); }
  });
}

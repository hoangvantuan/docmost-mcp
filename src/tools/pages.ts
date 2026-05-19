/**
 * Page tools for Docmost MCP Server.
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

const pageIdSchema = z.string().min(1).describe("Page ID");
const spaceIdSchema = z.string().uuid().describe("Space ID");
const formatSchema = z.enum(["json", "markdown", "html"]).default("markdown").describe("Content format");
const limitSchema = z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT).describe("Max results");
const pageNumSchema = z.number().int().min(1).default(1).describe("Page number");

export function registerPageTools(server: McpServer, client: DocmostClient): void {
  server.registerTool("docmost_search_pages", {
    title: "Search Pages",
    description: "Search pages by keyword across titles and content. Filter by spaceId or creatorId optionally.",
    inputSchema: {
      query: z.string().min(1).describe("Search query"),
      spaceId: spaceIdSchema.optional(),
      creatorId: z.string().uuid().optional().describe("Filter by creator user ID"),
      limit: limitSchema,
      offset: z.number().int().min(0).default(0).describe("Pagination offset"),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      const body: Record<string, unknown> = { query: params.query, limit: params.limit, offset: params.offset };
      if (params.spaceId) body.spaceId = params.spaceId;
      if (params.creatorId) body.creatorId = params.creatorId;
      return textResult(await client.request("/search", body));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_get_page", {
    title: "Get Page",
    description: "Get a page by ID with content. Format: json, markdown, or html.",
    inputSchema: {
      pageId: pageIdSchema,
      format: formatSchema,
      includeSpace: z.boolean().default(false).describe("Include space info in response"),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      return textResult(await client.request("/pages/info", {
        pageId: params.pageId,
        format: params.format,
        includeSpace: params.includeSpace,
      }));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_create_page", {
    title: "Create Page",
    description: "Create a new page in a space. Content can be markdown, html, or json (TipTap).",
    inputSchema: {
      spaceId: spaceIdSchema,
      title: z.string().optional().describe("Page title"),
      content: z.string().optional().describe("Page content"),
      format: formatSchema,
      parentPageId: z.string().optional().describe("Parent page ID for nesting"),
      icon: z.string().optional().describe("Page icon emoji"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, async (params) => {
    try {
      const body: Record<string, unknown> = { spaceId: params.spaceId, format: params.format };
      if (params.title) body.title = params.title;
      if (params.content) body.content = params.content;
      if (params.parentPageId) body.parentPageId = params.parentPageId;
      if (params.icon) body.icon = params.icon;
      return textResult(await client.request("/pages/create", body));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_update_page", {
    title: "Update Page",
    description: "Update page title, content, or icon. Operation: replace (default), append, or prepend.",
    inputSchema: {
      pageId: pageIdSchema,
      title: z.string().optional().describe("New title"),
      content: z.string().optional().describe("New content"),
      format: formatSchema,
      operation: z.enum(["replace", "append", "prepend"]).default("replace").describe("Content operation"),
      icon: z.string().optional().describe("New icon emoji"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      const body: Record<string, unknown> = { pageId: params.pageId, format: params.format, operation: params.operation };
      if (params.title !== undefined) body.title = params.title;
      if (params.content !== undefined) body.content = params.content;
      if (params.icon !== undefined) body.icon = params.icon;
      return textResult(await client.request("/pages/update", body));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_delete_page", {
    title: "Delete Page",
    description: "Move page to trash. Set permanentlyDelete=true to permanently delete (requires space admin).",
    inputSchema: {
      pageId: pageIdSchema,
      permanentlyDelete: z.boolean().default(false).describe("Permanently delete"),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  }, async (params) => {
    try {
      await client.request("/pages/delete", { pageId: params.pageId, permanentlyDelete: params.permanentlyDelete });
      return msgResult(`Page ${params.pageId} ${params.permanentlyDelete ? "permanently deleted" : "moved to trash"}.`);
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_restore_page", {
    title: "Restore Page",
    description: "Restore a page from trash back to its space.",
    inputSchema: { pageId: pageIdSchema },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      await client.request("/pages/restore", { pageId: params.pageId });
      return msgResult(`Page ${params.pageId} restored from trash.`);
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_list_pages", {
    title: "List Pages in Space",
    description: "List root-level pages in a space (sidebar tree).",
    inputSchema: {
      spaceId: spaceIdSchema,
      limit: z.number().int().min(1).max(MAX_LIMIT).default(50).describe("Max results"),
      page: pageNumSchema,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      return textResult(await client.request("/pages/sidebar-pages", { spaceId: params.spaceId, limit: params.limit, page: params.page }));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_list_child_pages", {
    title: "List Child Pages",
    description: "List child pages of a specific parent page.",
    inputSchema: {
      pageId: pageIdSchema,
      limit: z.number().int().min(1).max(MAX_LIMIT).default(50).describe("Max results"),
      page: pageNumSchema,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      return textResult(await client.request("/pages/sidebar-pages", { pageId: params.pageId, limit: params.limit, page: params.page }));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_get_recent_pages", {
    title: "Get Recent Pages",
    description: "Get recently updated pages, optionally filtered by space.",
    inputSchema: {
      spaceId: spaceIdSchema.optional(),
      limit: limitSchema,
      page: pageNumSchema,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      const body: Record<string, unknown> = { limit: params.limit, page: params.page };
      if (params.spaceId) body.spaceId = params.spaceId;
      return textResult(await client.request("/pages/recent", body));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_list_trash", {
    title: "List Trash",
    description: "List deleted pages in a space's trash.",
    inputSchema: {
      spaceId: spaceIdSchema,
      limit: limitSchema,
      page: pageNumSchema,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      return textResult(await client.request("/pages/trash", { spaceId: params.spaceId, limit: params.limit, page: params.page }));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_get_page_history", {
    title: "Get Page History",
    description: "Get version history of a page. Returns list of history entries with timestamps.",
    inputSchema: {
      pageId: pageIdSchema,
      limit: limitSchema,
      page: pageNumSchema,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      return textResult(await client.request("/pages/history", { pageId: params.pageId, limit: params.limit, page: params.page }));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_get_history_version", {
    title: "Get History Version",
    description: "Get content of a specific page history version by historyId.",
    inputSchema: {
      historyId: z.string().uuid().describe("History version ID"),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      return textResult(await client.request("/pages/history/info", { historyId: params.historyId }));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_move_page", {
    title: "Move Page",
    description: "Reorder a page within its space hierarchy. Use position (fractional index string) to set order, and parentPageId to change parent (null = root level).",
    inputSchema: {
      pageId: pageIdSchema,
      position: z.string().min(5).max(12).describe("Fractional index position string for ordering"),
      parentPageId: z.string().nullable().optional().describe("New parent page ID, null for root level"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      const body: Record<string, unknown> = { pageId: params.pageId, position: params.position };
      if (params.parentPageId !== undefined) body.parentPageId = params.parentPageId;
      await client.request("/pages/move", body);
      return msgResult(`Page ${params.pageId} moved.`);
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_move_page_to_space", {
    title: "Move Page to Space",
    description: "Move a page and its children to a different space.",
    inputSchema: {
      pageId: pageIdSchema,
      spaceId: spaceIdSchema,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      await client.request("/pages/move-to-space", { pageId: params.pageId, spaceId: params.spaceId });
      return msgResult(`Page ${params.pageId} moved to space ${params.spaceId}.`);
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_duplicate_page", {
    title: "Duplicate Page",
    description: "Duplicate a page and its children. Optionally to another space.",
    inputSchema: {
      pageId: pageIdSchema,
      spaceId: spaceIdSchema.optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, async (params) => {
    try {
      const body: Record<string, unknown> = { pageId: params.pageId };
      if (params.spaceId) body.spaceId = params.spaceId;
      return textResult(await client.request("/pages/duplicate", body));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_get_backlinks", {
    title: "Get Page Backlinks",
    description: "Get pages that link to this page (incoming) or pages this page links to (outgoing).",
    inputSchema: {
      pageId: pageIdSchema,
      direction: z.enum(["incoming", "outgoing"]).describe("Link direction: incoming (who links here) or outgoing (what this links to)"),
      limit: limitSchema,
      page: pageNumSchema,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      return textResult(await client.request("/pages/backlinks", {
        pageId: params.pageId,
        direction: params.direction,
        limit: params.limit,
        page: params.page,
      }));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_export_page", {
    title: "Export Page",
    description: "Export a page as HTML or Markdown. Optionally include children and attachments.",
    inputSchema: {
      pageId: pageIdSchema,
      format: z.enum(["html", "markdown"]).describe("Export format"),
      includeChildren: z.boolean().default(false).describe("Include child pages"),
      includeAttachments: z.boolean().default(false).describe("Include file attachments"),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      return textResult(await client.request("/pages/export", params as unknown as Record<string, unknown>));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_get_page_labels", {
    title: "Get Page Labels",
    description: "Get all labels attached to a page.",
    inputSchema: { pageId: pageIdSchema },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      return textResult(await client.request("/pages/labels", { pageId: params.pageId }));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_add_page_labels", {
    title: "Add Labels to Page",
    description: "Add one or more labels to a page. Label names: lowercase alphanumeric with hyphens/underscores (e.g. 'my-label', 'draft').",
    inputSchema: {
      pageId: pageIdSchema,
      names: z.array(z.string().max(100)).min(1).max(25).describe("Label names to add"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      return textResult(await client.request("/pages/labels/add", { pageId: params.pageId, names: params.names }));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_remove_page_label", {
    title: "Remove Label from Page",
    description: "Remove a specific label from a page by label ID.",
    inputSchema: {
      pageId: pageIdSchema,
      labelId: z.string().uuid().describe("Label ID to remove"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      await client.request("/pages/labels/remove", { pageId: params.pageId, labelId: params.labelId });
      return msgResult(`Label ${params.labelId} removed from page ${params.pageId}.`);
    } catch (error) { return errorResult(error); }
  });
}

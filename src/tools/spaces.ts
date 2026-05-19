/**
 * Space tools for Docmost MCP Server.
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

const spaceIdSchema = z.string().uuid().describe("Space ID");
const limitSchema = z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT).describe("Max results");
const pageNumSchema = z.number().int().min(1).default(1).describe("Page number");

export function registerSpaceTools(server: McpServer, client: DocmostClient): void {
  server.registerTool("docmost_list_spaces", {
    title: "List Spaces",
    description: "List all spaces the authenticated user has access to.",
    inputSchema: {
      limit: z.number().int().min(1).max(MAX_LIMIT).default(50).describe("Max results"),
      page: pageNumSchema,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      return textResult(await client.request("/spaces/", { limit: params.limit, page: params.page }));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_get_space", {
    title: "Get Space Info",
    description: "Get detailed info about a space by its ID.",
    inputSchema: { spaceId: spaceIdSchema },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      return textResult(await client.request("/spaces/info", { spaceId: params.spaceId }));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_create_space", {
    title: "Create Space",
    description: "Create a new space. Requires workspace-level Manage Space permission.",
    inputSchema: {
      name: z.string().min(2).max(100).describe("Space name"),
      slug: z.string().min(2).max(100).describe("URL slug (alphanumeric only)"),
      description: z.string().optional().describe("Space description"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, async (params) => {
    try {
      const body: Record<string, unknown> = { name: params.name, slug: params.slug };
      if (params.description) body.description = params.description;
      return textResult(await client.request("/spaces/create", body));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_update_space", {
    title: "Update Space",
    description: "Update space name, description, slug, or settings. Requires space admin.",
    inputSchema: {
      spaceId: spaceIdSchema,
      name: z.string().min(2).max(100).optional().describe("New name"),
      description: z.string().optional().describe("New description"),
      slug: z.string().min(2).max(100).optional().describe("New URL slug"),
      allowViewerComments: z.boolean().optional().describe("Allow viewers to comment"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      const body: Record<string, unknown> = { spaceId: params.spaceId };
      if (params.name) body.name = params.name;
      if (params.description !== undefined) body.description = params.description;
      if (params.slug) body.slug = params.slug;
      if (params.allowViewerComments !== undefined) body.allowViewerComments = params.allowViewerComments;
      return textResult(await client.request("/spaces/update", body));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_delete_space", {
    title: "Delete Space",
    description: "Delete a space and all its pages. Requires space admin. This is IRREVERSIBLE.",
    inputSchema: { spaceId: spaceIdSchema },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  }, async (params) => {
    try {
      await client.request("/spaces/delete", { spaceId: params.spaceId });
      return msgResult(`Space ${params.spaceId} deleted.`);
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_list_space_members", {
    title: "List Space Members",
    description: "List members (users and groups) of a specific space with their roles.",
    inputSchema: {
      spaceId: spaceIdSchema,
      limit: limitSchema,
      page: pageNumSchema,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      return textResult(await client.request("/spaces/members", { spaceId: params.spaceId, limit: params.limit, page: params.page }));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_add_space_members", {
    title: "Add Space Members",
    description: "Add users and/or groups to a space with a specific role (admin, writer, reader).",
    inputSchema: {
      spaceId: spaceIdSchema,
      role: z.string().describe("Space role: admin, writer, or reader"),
      userIds: z.array(z.string().uuid()).max(25).default([]).describe("User IDs to add"),
      groupIds: z.array(z.string().uuid()).max(25).default([]).describe("Group IDs to add"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      await client.request("/spaces/members/add", {
        spaceId: params.spaceId,
        role: params.role,
        userIds: params.userIds,
        groupIds: params.groupIds,
      });
      return msgResult(`Members added to space ${params.spaceId}.`);
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_remove_space_member", {
    title: "Remove Space Member",
    description: "Remove a user or group from a space. Provide either userId or groupId.",
    inputSchema: {
      spaceId: spaceIdSchema,
      userId: z.string().uuid().optional().describe("User ID to remove"),
      groupId: z.string().uuid().optional().describe("Group ID to remove"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      const body: Record<string, unknown> = { spaceId: params.spaceId };
      if (params.userId) body.userId = params.userId;
      if (params.groupId) body.groupId = params.groupId;
      await client.request("/spaces/members/remove", body);
      return msgResult(`Member removed from space ${params.spaceId}.`);
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_change_space_member_role", {
    title: "Change Space Member Role",
    description: "Change the role of a user or group in a space. Provide either userId or groupId.",
    inputSchema: {
      spaceId: spaceIdSchema,
      role: z.string().describe("New role: admin, writer, or reader"),
      userId: z.string().uuid().optional().describe("User ID"),
      groupId: z.string().uuid().optional().describe("Group ID"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      const body: Record<string, unknown> = { spaceId: params.spaceId, role: params.role };
      if (params.userId) body.userId = params.userId;
      if (params.groupId) body.groupId = params.groupId;
      await client.request("/spaces/members/change-role", body);
      return msgResult(`Role updated for member in space ${params.spaceId}.`);
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_export_space", {
    title: "Export Space",
    description: "Export all pages in a space as HTML or Markdown.",
    inputSchema: {
      spaceId: spaceIdSchema,
      format: z.enum(["html", "markdown"]).describe("Export format"),
      includeAttachments: z.boolean().default(false).describe("Include file attachments"),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      return textResult(await client.request("/spaces/export", params as unknown as Record<string, unknown>));
    } catch (error) { return errorResult(error); }
  });
}

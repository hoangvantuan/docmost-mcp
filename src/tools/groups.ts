/**
 * Group tools for Docmost MCP Server.
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

const limitSchema = z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT).describe("Max results (1-100)");
const querySchema = z.string().optional().describe("Search filter (name)");
const cursorSchema = z.string().optional().describe("Pagination cursor for next page");
const groupIdSchema = z.string().uuid().describe("Group ID");
const userIdSchema = z.string().uuid().describe("User ID");

export function registerGroupTools(server: McpServer, client: DocmostClient): void {
  server.registerTool("docmost_list_groups", {
    title: "List Groups",
    description: "List groups in the workspace.",
    inputSchema: {
      limit: limitSchema,
      query: querySchema,
      cursor: cursorSchema,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      const body: Record<string, unknown> = { limit: params.limit };
      if (params.query !== undefined) body.query = params.query;
      if (params.cursor !== undefined) body.cursor = params.cursor;
      return textResult(await client.request("/groups/", body));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_get_group", {
    title: "Get Group Info",
    description: "Get detailed info about a group by its ID.",
    inputSchema: { groupId: groupIdSchema },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      return textResult(await client.request("/groups/info", { groupId: params.groupId }));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_create_group", {
    title: "Create Group",
    description: "Create a new group, optionally with initial members. Groups have no role; they are just a collection of users.",
    inputSchema: {
      name: z.string().min(2).max(100).describe("Group name"),
      description: z.string().optional().describe("Group description"),
      userIds: z.array(z.string().uuid()).max(50).optional().describe("User IDs to include in the group"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, async (params) => {
    try {
      const body: Record<string, unknown> = { name: params.name };
      if (params.description !== undefined) body.description = params.description;
      if (params.userIds !== undefined) body.userIds = params.userIds;
      return textResult(await client.request("/groups/create", body));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_update_group", {
    title: "Update Group",
    description: "Update a group's name, description, or member list.",
    inputSchema: {
      groupId: groupIdSchema,
      name: z.string().min(2).max(100).optional().describe("Group name"),
      description: z.string().optional().describe("Group description"),
      userIds: z.array(z.string().uuid()).max(50).optional().describe("User IDs to include in the group"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      const body: Record<string, unknown> = { groupId: params.groupId };
      if (params.name !== undefined) body.name = params.name;
      if (params.description !== undefined) body.description = params.description;
      if (params.userIds !== undefined) body.userIds = params.userIds;
      return textResult(await client.request("/groups/update", body));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_delete_group", {
    title: "Delete Group",
    description: "Delete a group. This is IRREVERSIBLE.",
    inputSchema: { groupId: groupIdSchema },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  }, async (params) => {
    try {
      await client.request("/groups/delete", { groupId: params.groupId });
      return msgResult(`Group ${params.groupId} deleted.`);
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_list_group_members", {
    title: "List Group Members",
    description: "List members of a specific group.",
    inputSchema: {
      groupId: groupIdSchema,
      limit: limitSchema,
      query: querySchema,
      cursor: cursorSchema,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      const body: Record<string, unknown> = { groupId: params.groupId, limit: params.limit };
      if (params.query !== undefined) body.query = params.query;
      if (params.cursor !== undefined) body.cursor = params.cursor;
      return textResult(await client.request("/groups/members", body));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_add_group_members", {
    title: "Add Group Members",
    description: "Add users to a group.",
    inputSchema: {
      groupId: groupIdSchema,
      userIds: z.array(z.string().uuid()).min(1).max(50).describe("User IDs to add (1-50)"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      await client.request("/groups/members/add", { groupId: params.groupId, userIds: params.userIds });
      return msgResult(`Members added to group ${params.groupId}.`);
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_remove_group_member", {
    title: "Remove Group Member",
    description: "Remove a user from a group. This only removes the user-group link, not the user itself.",
    inputSchema: {
      groupId: groupIdSchema,
      userId: userIdSchema,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      await client.request("/groups/members/remove", { groupId: params.groupId, userId: params.userId });
      return msgResult(`Member removed from group ${params.groupId}.`);
    } catch (error) { return errorResult(error); }
  });
}

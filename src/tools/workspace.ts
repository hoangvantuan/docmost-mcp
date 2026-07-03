/**
 * Workspace member & invitation tools for Docmost MCP Server.
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
const querySchema = z.string().optional().describe("Search filter (name/email)");
const cursorSchema = z.string().optional().describe("Pagination cursor for next page");
const userIdSchema = z.string().uuid().describe("User ID");
const invitationIdSchema = z.string().uuid().describe("Invitation ID");
const memberRoleSchema = z.enum(["owner", "admin", "member"]).describe("Workspace role");
const inviteRoleSchema = z.enum(["admin", "member"]).describe("Invite role (no owner)");

export function registerWorkspaceTools(server: McpServer, client: DocmostClient): void {
  // --- Nhóm A: Workspace members ---

  server.registerTool("docmost_list_workspace_members", {
    title: "List Workspace Members",
    description: "List members of the workspace. Requires workspace Read permission.",
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
      return textResult(await client.request("/workspace/members", body));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_change_workspace_member_role", {
    title: "Change Workspace Member Role",
    description: "Change a workspace member's role (owner, admin, member). Requires Manage Member permission.",
    inputSchema: {
      userId: userIdSchema,
      role: memberRoleSchema,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      await client.request("/workspace/members/change-role", { userId: params.userId, role: params.role });
      return msgResult(`Role updated for workspace member ${params.userId}.`);
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_deactivate_workspace_member", {
    title: "Deactivate Workspace Member",
    description: "Deactivate a workspace member, temporarily blocking access. Can be reversed with activate. Requires Manage Member permission.",
    inputSchema: {
      userId: userIdSchema,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      await client.request("/workspace/members/deactivate", { userId: params.userId });
      return msgResult(`Workspace member ${params.userId} deactivated.`);
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_activate_workspace_member", {
    title: "Activate Workspace Member",
    description: "Reactivate a previously deactivated workspace member. Requires Manage Member permission.",
    inputSchema: {
      userId: userIdSchema,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      await client.request("/workspace/members/activate", { userId: params.userId });
      return msgResult(`Workspace member ${params.userId} activated.`);
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_delete_workspace_member", {
    title: "Delete Workspace Member",
    description: "Permanently remove a member from the workspace. This is IRREVERSIBLE. Requires Manage Member permission.",
    inputSchema: {
      userId: userIdSchema,
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  }, async (params) => {
    try {
      await client.request("/workspace/members/delete", { userId: params.userId });
      return msgResult(`Workspace member ${params.userId} deleted.`);
    } catch (error) { return errorResult(error); }
  });

  // --- Nhóm B: Workspace invitations ---

  server.registerTool("docmost_list_invitations", {
    title: "List Invitations",
    description: "List pending workspace invitations.",
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
      return textResult(await client.request("/workspace/invites", body));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_create_invitation", {
    title: "Create Invitation",
    description: "Invite one or more users to the workspace by email, optionally auto-adding them to groups.",
    inputSchema: {
      emails: z.array(z.string().email()).min(1).max(50).describe("Email addresses to invite (1-50)"),
      role: inviteRoleSchema,
      groupIds: z.array(z.string().uuid()).max(25).optional().describe("Auto-add invited users to these groups"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, async (params) => {
    try {
      const body: Record<string, unknown> = { emails: params.emails, role: params.role };
      if (params.groupIds !== undefined) body.groupIds = params.groupIds;
      return textResult(await client.request("/workspace/invites/create", body));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_resend_invitation", {
    title: "Resend Invitation",
    description: "Resend an existing pending workspace invitation email.",
    inputSchema: {
      invitationId: invitationIdSchema,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      await client.request("/workspace/invites/resend", { invitationId: params.invitationId });
      return msgResult(`Invitation ${params.invitationId} resent.`);
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_revoke_invitation", {
    title: "Revoke Invitation",
    description: "Revoke a pending workspace invitation. This is IRREVERSIBLE.",
    inputSchema: {
      invitationId: invitationIdSchema,
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  }, async (params) => {
    try {
      await client.request("/workspace/invites/revoke", { invitationId: params.invitationId });
      return msgResult(`Invitation ${params.invitationId} revoked.`);
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("docmost_get_invitation_link", {
    title: "Get Invitation Link",
    description: "Get the shareable invitation link for a pending invitation. Self-hosted only — không hoạt động trên Docmost Cloud.",
    inputSchema: {
      invitationId: invitationIdSchema,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      return textResult(await client.request("/workspace/invites/link", { invitationId: params.invitationId }));
    } catch (error) { return errorResult(error); }
  });
}

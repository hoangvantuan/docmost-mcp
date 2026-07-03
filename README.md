# Docmost MCP Server

> MCP server that connects AI agents to [Docmost](https://docmost.com) wiki, enabling full page, space, comment, and user management through the [Model Context Protocol](https://modelcontextprotocol.io).

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-5FA04E?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![MCP SDK](https://img.shields.io/badge/MCP_SDK-1.6-000000?logo=anthropic&logoColor=white)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Overview

Docmost MCP Server exposes **54 tools** across six domains (pages, spaces, comments, users, workspace, groups) so any MCP-compatible AI client can read, create, edit, and organize your Docmost wiki.

Two transport modes:

- **stdio** for local, single-user setups (Claude Desktop, Claude Code)
- **HTTP** for remote, multi-user deployments with per-request authentication

## Quick start

```bash
git clone <repo-url>
cd docmost-mcp-server
npm install
npm run build
```

### Run with stdio

```bash
DOCMOST_URL="http://localhost:3000" \
DOCMOST_EMAIL="admin@example.com" \
DOCMOST_PASSWORD="your-password" \
npm start
```

### Run with HTTP

```bash
TRANSPORT=http PORT=3001 npm start
```

> [!TIP]
> Use `npm run dev` or `npm run dev:http` for hot-reload during development.

## Configuration

### Environment variables

| Variable | Description | stdio | HTTP |
|----------|-------------|:-----:|:----:|
| `DOCMOST_URL` | Docmost instance URL | Required | Via header |
| `DOCMOST_EMAIL` | Login email | Required | Via header |
| `DOCMOST_PASSWORD` | Login password | Required | Via header |
| `TRANSPORT` | `stdio` or `http` | Default | Set `http` |
| `PORT` | HTTP listen port | N/A | Default `3001` |

### HTTP headers

In HTTP mode, each request carries its own credentials:

| Header | Description |
|--------|-------------|
| `X-Docmost-Url` | Docmost instance URL |
| `X-Docmost-Email` | Login email |
| `X-Docmost-Password` | Login password |

Sessions are cached for 30 minutes per URL+email pair.

## Integration

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "docmost": {
      "command": "node",
      "args": ["/path/to/docmost-mcp-server/dist/index.js"],
      "env": {
        "DOCMOST_URL": "http://localhost:3000",
        "DOCMOST_EMAIL": "admin@example.com",
        "DOCMOST_PASSWORD": "your-password"
      }
    }
  }
}
```

### Claude Code (stdio)

Add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "docmost": {
      "command": "node",
      "args": ["/path/to/docmost-mcp-server/dist/index.js"],
      "env": {
        "DOCMOST_URL": "http://localhost:3000",
        "DOCMOST_EMAIL": "admin@example.com",
        "DOCMOST_PASSWORD": "your-password"
      }
    }
  }
}
```

### Claude Code (HTTP)

Start the server, then add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "docmost": {
      "type": "url",
      "url": "http://localhost:3001/mcp",
      "headers": {
        "X-Docmost-Url": "http://localhost:3000",
        "X-Docmost-Email": "admin@example.com",
        "X-Docmost-Password": "your-password"
      }
    }
  }
}
```

## Tools (54)

### Pages (20)

| Tool | Description |
|------|-------------|
| `docmost_search_pages` | Search pages by keyword, filter by space or creator |
| `docmost_get_page` | Get page content (markdown, html, or json) |
| `docmost_create_page` | Create a new page in a space |
| `docmost_update_page` | Update page content (replace, append, or prepend) |
| `docmost_delete_page` | Move page to trash or permanently delete |
| `docmost_restore_page` | Restore a page from trash |
| `docmost_list_pages` | List root-level pages in a space |
| `docmost_list_child_pages` | List child pages of a parent |
| `docmost_get_recent_pages` | Get recently updated pages |
| `docmost_list_trash` | List trashed pages in a space |
| `docmost_get_page_history` | Get version history of a page |
| `docmost_get_history_version` | Get content of a specific version |
| `docmost_move_page` | Reorder a page within its hierarchy |
| `docmost_move_page_to_space` | Move a page to another space |
| `docmost_duplicate_page` | Duplicate a page and its children |
| `docmost_get_backlinks` | Get incoming or outgoing backlinks |
| `docmost_export_page` | Export page as HTML or Markdown |
| `docmost_get_page_labels` | Get labels attached to a page |
| `docmost_add_page_labels` | Add labels to a page |
| `docmost_remove_page_label` | Remove a label from a page |

### Spaces (10)

| Tool | Description |
|------|-------------|
| `docmost_list_spaces` | List all accessible spaces |
| `docmost_get_space` | Get space details |
| `docmost_create_space` | Create a new space |
| `docmost_update_space` | Update space settings |
| `docmost_delete_space` | Delete a space (irreversible) |
| `docmost_list_space_members` | List space members and roles |
| `docmost_add_space_members` | Add users or groups to a space |
| `docmost_remove_space_member` | Remove a member from a space |
| `docmost_change_space_member_role` | Change a member's role |
| `docmost_export_space` | Export all pages in a space |

### Comments (5)

| Tool | Description |
|------|-------------|
| `docmost_get_comments` | List comments on a page |
| `docmost_get_comment` | Get a single comment |
| `docmost_create_comment` | Add a comment (TipTap JSON format) |
| `docmost_update_comment` | Update comment content |
| `docmost_delete_comment` | Delete a comment |

### Users (1)

| Tool | Description |
|------|-------------|
| `docmost_get_current_user` | Get authenticated user info |

### Workspace (10)

| Tool | Description |
|------|-------------|
| `docmost_list_workspace_members` | List members of the workspace |
| `docmost_change_workspace_member_role` | Change a workspace member's role (owner/admin/member) |
| `docmost_deactivate_workspace_member` | Deactivate a workspace member (reversible) |
| `docmost_activate_workspace_member` | Reactivate a previously deactivated member |
| `docmost_delete_workspace_member` | Permanently remove a member from the workspace |
| `docmost_list_invitations` | List pending workspace invitations |
| `docmost_create_invitation` | Invite users to the workspace by email |
| `docmost_resend_invitation` | Resend a pending invitation email |
| `docmost_revoke_invitation` | Revoke a pending invitation |
| `docmost_get_invitation_link` | Get the shareable invitation link (self-hosted only) |

### Groups (8)

| Tool | Description |
|------|-------------|
| `docmost_list_groups` | List groups in the workspace |
| `docmost_get_group` | Get detailed info about a group |
| `docmost_create_group` | Create a new group |
| `docmost_update_group` | Update a group's name, description, or members |
| `docmost_delete_group` | Delete a group (irreversible) |
| `docmost_list_group_members` | List members of a group |
| `docmost_add_group_members` | Add users to a group |
| `docmost_remove_group_member` | Remove a user from a group |

## HTTP API

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/mcp` | MCP protocol endpoint |
| `GET` | `/health` | Health check |

### Health check

```bash
curl http://localhost:3001/health
# {"status":"ok","server":"docmost-mcp-server","version":"1.3.0"}
```

### Direct call (test/debug)

```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "X-Docmost-Url: http://localhost:3000" \
  -H "X-Docmost-Email: admin@example.com" \
  -H "X-Docmost-Password: your-password" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

### Production deployment

```bash
# pm2
pm2 start dist/index.js --name docmost-mcp \
  --env TRANSPORT=http \
  --env PORT=3001

# Docker
docker build -t docmost-mcp .
docker run -d -p 3001:3001 -e TRANSPORT=http docmost-mcp
```

## Project structure

```
src/
├── index.ts              # Entry point, transport setup
├── constants.ts          # Limits and timeout config
├── services/
│   └── api-client.ts     # DocmostClient, session cache
└── tools/
    ├── pages.ts          # 20 page tools
    ├── spaces.ts         # 10 space tools
    ├── comments.ts       # 5 comment tools
    ├── users.ts          # 1 user tool
    ├── workspace.ts      # 10 workspace tools
    └── groups.ts         # 8 group tools
```

## Prerequisites

- **Node.js** >= 18
- A running **Docmost** instance
- A Docmost account with appropriate permissions

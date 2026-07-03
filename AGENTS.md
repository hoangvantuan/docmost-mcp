# Docmost MCP Server

MCP server kết nối AI agent với Docmost wiki. Hỗ trợ stdio (local) và HTTP (remote) transport.

## Kiến trúc

```
src/
├── index.ts              # Entry point, transport setup (stdio/HTTP)
├── constants.ts          # CHARACTER_LIMIT, DEFAULT_LIMIT, MAX_LIMIT, REQUEST_TIMEOUT
├── services/
│   └── api-client.ts     # DocmostClient class, session cache, handleApiError()
└── tools/
    ├── pages.ts          # 20 tool: search, CRUD, move, history, labels, backlinks, export
    ├── spaces.ts         # 10 tool: CRUD, members (add/remove/role), export
    ├── comments.ts       # 5 tool: list, get, create, update, delete
    ├── users.ts          # 1 tool: get current user
    ├── workspace.ts      # 10 tool: workspace members (5) + invitations (5)
    └── groups.ts         # 8 tool: group CRUD + members
```

## Quy ước code

- Mọi Docmost API dùng POST, kể cả read. Gọi qua `client.request(endpoint, body)`.
- `DocmostClient` là class-based. Stdio: tạo 1 lần từ env vars. HTTP: tạo per-request từ headers, cache 30 phút theo URL+email.
- Mỗi tool file export 1 function `registerXxxTools(server: McpServer, client: DocmostClient)`.
- Helper dùng chung trong mỗi file: `textResult()`, `errorResult()`, `msgResult()`.
- Zod schema dùng chung: `pageIdSchema`, `spaceIdSchema`, `limitSchema`, `pageNumSchema`, `formatSchema`.
- Tool name prefix: `docmost_`. Snake_case. Ví dụ: `docmost_create_page`.
- Annotation bắt buộc: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`.

## Docmost API

- Base URL: `{DOCMOST_URL}/api`
- Auth: POST `/auth/login` trả cookie `authToken`, gắn vào mọi request sau.
- Tất cả endpoint dùng POST với JSON body.
- Pagination: `limit` + `page` (number-based) hoặc `limit` + `offset`.

## Transport & Authentication

### stdio (local, single user)
- Credentials từ **env vars**: `DOCMOST_URL`, `DOCMOST_EMAIL`, `DOCMOST_PASSWORD`
- Authenticate 1 lần khi khởi động, dùng suốt process.
- Lệnh: `npm start`

### HTTP (remote, multi user)
- Credentials từ **request headers** mỗi lần gọi:
  - `X-Docmost-Url`: URL Docmost instance
  - `X-Docmost-Email`: Email đăng nhập
  - `X-Docmost-Password`: Password
- Server KHÔNG cần env vars cho Docmost credentials.
- Session cache 30 phút theo URL+email (tránh login mỗi request).
- api-client.ts exports: `DocmostClient`, `getOrCreateClient()`, `handleApiError()`
- Lệnh: `TRANSPORT=http npm start`

### Env vars

| Biến | Mô tả | stdio | HTTP |
|------|--------|-------|------|
| `DOCMOST_URL` | URL Docmost | Bắt buộc | Không dùng (header) |
| `DOCMOST_EMAIL` | Email | Bắt buộc | Không dùng (header) |
| `DOCMOST_PASSWORD` | Password | Bắt buộc | Không dùng (header) |
| `TRANSPORT` | `stdio` hoặc `http` | Mặc định | Set `http` |
| `PORT` | HTTP port | Không dùng | Mặc định `3001` |

## Thêm tool mới

1. Xác định endpoint từ Docmost source: `apps/server/src/core/{domain}/{domain}.controller.ts`
2. Đọc DTO: `apps/server/src/core/{domain}/dto/` để biết chính xác field, validation rule.
3. Thêm `server.registerTool()` vào file tool phù hợp (hoặc tạo file mới nếu domain mới).
4. Tool handler nhận `client: DocmostClient` qua closure (truyền từ `registerXxxTools`).
5. Đặt annotation chính xác. Đọc = `readOnlyHint: true`. Xóa = `destructiveHint: true`.
6. Build: `npm run build`. Không commit nếu build fail.

## Build & test

```bash
npm run build       # TypeScript → dist/
npm start           # Chạy stdio
npm run start:http  # Chạy HTTP
npm run dev         # Dev mode với hot reload
```

## Danh sách 54 tool hiện tại

### Pages (20)
- `docmost_search_pages` - Tìm page theo keyword
- `docmost_get_page` - Lấy page theo ID
- `docmost_create_page` - Tạo page mới
- `docmost_update_page` - Cập nhật page (replace/append/prepend)
- `docmost_delete_page` - Xóa page (trash hoặc permanent)
- `docmost_restore_page` - Khôi phục page từ trash
- `docmost_list_pages` - Danh sách page gốc trong space
- `docmost_list_child_pages` - Danh sách page con
- `docmost_get_recent_pages` - Page cập nhật gần đây
- `docmost_list_trash` - Danh sách page trong trash
- `docmost_get_page_history` - Lịch sử phiên bản
- `docmost_get_history_version` - Nội dung phiên bản cụ thể
- `docmost_move_page` - Sắp xếp lại vị trí page trong hierarchy
- `docmost_move_page_to_space` - Di chuyển page sang space khác
- `docmost_duplicate_page` - Nhân bản page
- `docmost_get_backlinks` - Incoming/outgoing backlinks
- `docmost_export_page` - Export HTML/Markdown
- `docmost_get_page_labels` - Labels gắn trên page
- `docmost_add_page_labels` - Thêm labels
- `docmost_remove_page_label` - Xóa label

### Spaces (10)
- `docmost_list_spaces` - Danh sách space
- `docmost_get_space` - Chi tiết space
- `docmost_create_space` - Tạo space
- `docmost_update_space` - Cập nhật space
- `docmost_delete_space` - Xóa space (KHÔNG thể hoàn tác)
- `docmost_list_space_members` - Danh sách thành viên
- `docmost_add_space_members` - Thêm thành viên
- `docmost_remove_space_member` - Xóa thành viên
- `docmost_change_space_member_role` - Đổi role thành viên
- `docmost_export_space` - Export toàn bộ space

### Comments (5)
- `docmost_get_comments` - Danh sách comment trên page
- `docmost_get_comment` - Chi tiết 1 comment
- `docmost_create_comment` - Tạo comment (TipTap JSON)
- `docmost_update_comment` - Cập nhật comment
- `docmost_delete_comment` - Xóa comment

### Users (1)
- `docmost_get_current_user` - Thông tin user đang đăng nhập

### Workspace (10)
- `docmost_list_workspace_members` - Danh sách thành viên workspace
- `docmost_change_workspace_member_role` - Đổi role thành viên (owner/admin/member)
- `docmost_deactivate_workspace_member` - Khóa tạm thành viên (khôi phục được)
- `docmost_activate_workspace_member` - Kích hoạt lại thành viên
- `docmost_delete_workspace_member` - Xóa hẳn thành viên khỏi workspace
- `docmost_list_invitations` - Danh sách lời mời
- `docmost_create_invitation` - Tạo lời mời (email + role, tùy chọn groupIds)
- `docmost_resend_invitation` - Gửi lại lời mời
- `docmost_revoke_invitation` - Hủy lời mời
- `docmost_get_invitation_link` - Lấy link lời mời (self-hosted only)

### Groups (8)
- `docmost_list_groups` - Danh sách group
- `docmost_get_group` - Chi tiết group
- `docmost_create_group` - Tạo group
- `docmost_update_group` - Cập nhật group
- `docmost_delete_group` - Xóa group
- `docmost_list_group_members` - Danh sách thành viên group
- `docmost_add_group_members` - Thêm thành viên vào group
- `docmost_remove_group_member` - Gỡ thành viên khỏi group

## Quy tắc bảo trì docs

Dự án có 4 file docs, CẬP NHẬT SAU MỖI THAY ĐỔI:

| File | Đối tượng | Nội dung |
|------|-----------|----------|
| `AGENTS.md` | Mọi AI tool (Cursor, Windsurf, Copilot, ...) | Kiến trúc, quy ước code, danh sách tool, hướng dẫn thêm tool |
| `CLAUDE.md` | Claude Code | Reference đến AGENTS.md (`@AGENTS.md`) |
| `README.md` | Human developer | Cài đặt, cấu hình, sử dụng, danh sách tool |
| `CHANGELOG.md` | Tất cả | Log thay đổi theo phiên bản, ngày tháng |

**CLAUDE.md chỉ chứa `@AGENTS.md`.** Không viết nội dung trực tiếp vào CLAUDE.md. Mọi thông tin cho AI đặt trong AGENTS.md.

**Khi nào cập nhật:**
- Thêm/xóa/đổi tên tool → cập nhật AGENTS.md + README.md + CHANGELOG.md
- Thay đổi env vars, transport, cấu hình → cập nhật AGENTS.md + README.md
- Thay đổi code logic (bug fix, refactor) → cập nhật CHANGELOG.md
- Thay đổi kiến trúc (thêm file, đổi cấu trúc) → cập nhật AGENTS.md

**Format CHANGELOG.md:**
```
## [version] - YYYY-MM-DD
### Added / Changed / Removed / Fixed
- Mô tả thay đổi
```

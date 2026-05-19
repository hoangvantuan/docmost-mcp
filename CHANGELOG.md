# Changelog

## [1.2.0] - 2026-05-19

### Changed
- **Session cache**: `getOrCreateClient()` cache DocmostClient 30 phút theo URL+email, tránh login mỗi request.
- Bỏ token-based auth (không phù hợp MCP client). Giữ credentials qua headers `X-Docmost-*`.

## [1.1.0] - 2026-05-19

### Changed
- **HTTP auth qua headers**: Client gửi `X-Docmost-Url`, `X-Docmost-Email`, `X-Docmost-Password` mỗi request. Server không cần env vars cho credentials ở HTTP mode.
- **API client class-based**: `DocmostClient` thay thế module-level singleton. Mỗi tool file nhận client qua tham số.
- **Session cache**: Cache authenticated client 30 phút theo URL+email, tránh login mỗi request.
- Tách AGENTS.md (cho mọi AI tool), CLAUDE.md chỉ reference `@AGENTS.md`.

## [1.0.0] - 2026-05-19

### Added
- **HTTP transport**: Hỗ trợ streamable HTTP bên cạnh stdio. Chạy qua `TRANSPORT=http`.
- **Page tools mới**: restore, trash, history (list + version), move, backlinks, export, labels (get/add/remove), list child pages, recent pages.
- **Space tools mới**: add/remove members, change member role, export space.
- **Comment tools mới**: get comment (chi tiết), update comment.
- Health check endpoint `GET /health` cho HTTP mode.
- Scripts: `start:http`, `dev:http`.
- Tài liệu: AGENTS.md (cho AI), CLAUDE.md (reference), README.md (cho human), CHANGELOG.md.

### Changed
- Refactor helper functions (`textResult`, `errorResult`, `msgResult`) vào từng tool file, giảm lặp code.
- Trích xuất Zod schema dùng chung (`pageIdSchema`, `spaceIdSchema`, `limitSchema`, `pageNumSchema`, `formatSchema`).
- `docmost_get_page` thêm param `includeSpace`.
- `docmost_search_pages` thêm filter `creatorId`.
- `docmost_update_space` thêm `slug`, `allowViewerComments`.

### Removed
- `docmost_search_suggest`: search_pages đủ cho AI, không cần autocomplete.
- `docmost_get_pages_by_user`: search + creatorId filter thay thế.
- `docmost_get_breadcrumbs`: thông tin UI navigation, AI không cần.
- `docmost_get_backlinks_count`: chỉ đếm, get_backlinks trả đủ data.
- `docmost_update_user`: cập nhật profile hiếm khi qua AI.

## [0.1.0] - 2026-05-19

### Added
- Phiên bản đầu tiên với 22 tool.
- Hỗ trợ stdio transport.
- Cookie-based authentication.
- Page tools: search, get, create, update, delete, list, list child, move to space, duplicate, recent.
- Space tools: list, get, create, update, delete, list members.
- Comment tools: list, create, delete.
- User tools: get current user.

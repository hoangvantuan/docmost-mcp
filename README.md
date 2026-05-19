# Docmost MCP Server

MCP server cho [Docmost](https://docmost.com) wiki. Cho phép AI agent đọc, tạo, sửa, xóa page và quản lý space qua MCP protocol.

Hỗ trợ 2 transport:
- **stdio** cho tích hợp local (Claude Desktop, Claude Code)
- **HTTP** cho tích hợp remote (multi-client, web service)

## Cài đặt

```bash
git clone <repo-url>
cd docmost-mcp-server
npm install
npm run build
```

## Cấu hình

### stdio mode (local, single user)

Credentials qua env vars, authenticate 1 lần khi khởi động:

```bash
export DOCMOST_URL="http://localhost:3000"
export DOCMOST_EMAIL="admin@example.com"
export DOCMOST_PASSWORD="your-password"
```

### HTTP mode (remote, multi user)

Server KHÔNG cần env vars cho Docmost credentials. Mỗi client tự gửi credentials qua HTTP headers:

| Header | Mô tả |
|--------|--------|
| `X-Docmost-Url` | URL Docmost instance |
| `X-Docmost-Email` | Email đăng nhập |
| `X-Docmost-Password` | Password |

Server cache session 30 phút theo URL+email (tránh login mỗi request).

Biến tùy chọn:

| Biến | Mô tả | Mặc định |
|------|--------|----------|
| `TRANSPORT` | `stdio` hoặc `http` | `stdio` |
| `PORT` | Port cho HTTP transport | `3001` |

## Chạy

### stdio (local)

```bash
DOCMOST_URL="http://localhost:3000" \
DOCMOST_EMAIL="admin@example.com" \
DOCMOST_PASSWORD="your-password" \
npm start
```

### HTTP (remote)

```bash
TRANSPORT=http PORT=3001 npm start
```

Endpoint:
- `POST /mcp` MCP protocol
- `GET /health` health check

### Dev mode

```bash
npm run dev        # stdio + hot reload
npm run dev:http   # HTTP + hot reload
```

## Tích hợp Claude Desktop

Thêm vào `claude_desktop_config.json`:

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

## Tích hợp Claude Code

Thêm vào `.claude/settings.json`:

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

## Danh sách tool (36)

### Pages (20)

| Tool | Mô tả |
|------|--------|
| `docmost_search_pages` | Tìm page theo keyword, filter theo space/creator |
| `docmost_get_page` | Lấy nội dung page (markdown/html/json) |
| `docmost_create_page` | Tạo page mới trong space |
| `docmost_update_page` | Cập nhật page (replace/append/prepend) |
| `docmost_delete_page` | Xóa page (trash hoặc permanent) |
| `docmost_restore_page` | Khôi phục page từ trash |
| `docmost_list_pages` | Danh sách page gốc trong space |
| `docmost_list_child_pages` | Danh sách page con |
| `docmost_get_recent_pages` | Page cập nhật gần đây |
| `docmost_list_trash` | Danh sách page trong trash |
| `docmost_get_page_history` | Lịch sử phiên bản page |
| `docmost_get_history_version` | Nội dung phiên bản cụ thể |
| `docmost_move_page` | Sắp xếp lại vị trí page trong hierarchy |
| `docmost_move_page_to_space` | Di chuyển page sang space khác |
| `docmost_duplicate_page` | Nhân bản page |
| `docmost_get_backlinks` | Incoming/outgoing backlinks |
| `docmost_export_page` | Export HTML/Markdown |
| `docmost_get_page_labels` | Labels gắn trên page |
| `docmost_add_page_labels` | Thêm labels vào page |
| `docmost_remove_page_label` | Xóa label khỏi page |

### Spaces (10)

| Tool | Mô tả |
|------|--------|
| `docmost_list_spaces` | Danh sách space |
| `docmost_get_space` | Chi tiết space |
| `docmost_create_space` | Tạo space mới |
| `docmost_update_space` | Cập nhật space |
| `docmost_delete_space` | Xóa space (KHÔNG thể hoàn tác) |
| `docmost_list_space_members` | Danh sách thành viên |
| `docmost_add_space_members` | Thêm thành viên vào space |
| `docmost_remove_space_member` | Xóa thành viên khỏi space |
| `docmost_change_space_member_role` | Đổi role thành viên |
| `docmost_export_space` | Export toàn bộ space |

### Comments (5)

| Tool | Mô tả |
|------|--------|
| `docmost_get_comments` | Danh sách comment trên page |
| `docmost_get_comment` | Chi tiết 1 comment |
| `docmost_create_comment` | Tạo comment (TipTap JSON format) |
| `docmost_update_comment` | Cập nhật comment |
| `docmost_delete_comment` | Xóa comment |

### Users (1)

| Tool | Mô tả |
|------|--------|
| `docmost_get_current_user` | Thông tin user đang đăng nhập |

## Tích hợp qua HTTP transport

HTTP mode: server KHÔNG giữ credentials. Mỗi client tự gửi qua headers. Server cache session 30 phút theo URL+email.

### 1. Khởi động server

```bash
TRANSPORT=http PORT=3001 npm start
```

Server lắng nghe tại `http://localhost:3001/mcp`. Không cần set DOCMOST_URL/EMAIL/PASSWORD.

### 2. Kiểm tra server hoạt động

```bash
curl http://localhost:3001/health
# {"status":"ok","server":"docmost-mcp-server","version":"1.2.0"}
```

### 3. Cấu hình MCP client

Client cần gửi 3 headers mỗi request:

```
X-Docmost-Url: http://localhost:3000
X-Docmost-Email: admin@example.com
X-Docmost-Password: your-password
```

Ví dụ cấu hình cho Claude Code (`.claude/settings.json`):

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

### 4. Gọi trực tiếp (test/debug)

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

### 5. Deploy production

```bash
# pm2 (chỉ cần TRANSPORT và PORT)
pm2 start dist/index.js --name docmost-mcp \
  --env TRANSPORT=http \
  --env PORT=3001

# docker
docker build -t docmost-mcp .
docker run -d -p 3001:3001 \
  -e TRANSPORT=http \
  docmost-mcp
```

## Yêu cầu

- Node.js >= 18
- Docmost instance đang chạy
- Tài khoản Docmost có quyền truy cập

## License

MIT

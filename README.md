# snip-backend

Tiny URL shortener backend built with [Bun](https://bun.sh). Zero npm dependencies — a single `server.js` file backed by an in-memory `Map`.

## API

| Method | Path | Body | Response |
|--------|------|------|----------|
| `POST` | `/api/links` | `{ "url": "https://…" }` | `201` link object |
| `GET` | `/api/links` | — | `200` array of all link objects |
| `GET` | `/:code` | — | `302` redirect; `404` if unknown |

### Link object

```json
{
  "code": "aB3xYz",
  "url": "https://example.com/very/long/path",
  "shortUrl": "http://localhost:3000/aB3xYz",
  "hits": 0,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

Codes are 6 random base-62 characters. `hits` increments on every redirect.

## Running

```sh
bun run server.js
# or
bun start
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port to listen on |
| `BASE_URL` | `http://localhost:{PORT}` | Origin used in `shortUrl` values |
| `RAILWAY_PUBLIC_DOMAIN` | — | Auto-detected Railway domain (used when `BASE_URL` is not set) |
| `PUBLIC_DIR` | — | Serve static files from this folder when set (`/` → `index.html`; an existing file wins over a same-named short code) |

## CORS

All routes return `Access-Control-Allow-Origin: *` so a browser app on any origin can call the API directly. `OPTIONS` preflight requests are handled automatically.

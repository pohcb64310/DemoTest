# Snip — AI assistant context

> **Sync note:** This file is mirrored verbatim at `.github/copilot-instructions.md`
> (GitHub Copilot) and at `CLAUDE.md` (Claude Code).  Edit both files together.

---

## What this repo is

One GitHub repository, five **orphan branches** (no shared history).
`main` is a pure superproject — it holds only `.gitmodules`, `README.md`,
`scripts/`, and `.github/`.  Every other branch is a self-contained layer,
mounted on `main` as a git submodule.

## Branch / tech-stack layout

| Branch | Submodule path | Stack | Key files |
|--------|---------------|-------|-----------|
| `main` | — | superproject | `.gitmodules`, `scripts/build-bundle.mjs`, `.github/workflows/` |
| `backend` | `backend/` | Bun ≥ 1, zero npm deps | `server.js` (single-file), in-memory `Map` store |
| `frontend` | `frontend/` | Angular 19, standalone, signals | `src/`, build output → `dist/snip-frontend/browser/` |
| `cli` | `cli/` | CommonJS Node ≥ 18, zero npm deps | `cli.js` (`require()` throughout) |
| `bundle` | `bundle/` | **Generated output — do not edit** | `server.js`, `cli.js`, `public/`, `Dockerfile`, `.env`, `railway.json` |

## API contract — change everywhere or nowhere

| Method | Path | Body | Success | Error |
|--------|------|------|---------|-------|
| `POST` | `/api/links` | `{ "url": "https://…" }` | `201 { code, url, shortUrl, hits, createdAt }` | `400 { error }` |
| `GET` | `/api/links` | — | `200 [{ … }]` | — |
| `GET` | `/:code` | — | `302 → original URL` | `404` |

- `code`: 6 random base-62 chars; `hits` starts at 0 and increments on every redirect
- `shortUrl`: `<BASE_URL>/<code>`; `BASE_URL` defaults to `http://localhost:3000`, then `RAILWAY_PUBLIC_DOMAIN`, then env
- `createdAt`: ISO 8601 timestamp
- If you change the response shape, update `backend/server.js`, `frontend/src/app/links.service.ts`, and `cli/cli.js`

## Key commands

```sh
# Run backend (port 3000)
cd backend && bun start

# Run frontend dev server (port 4200; backend must be running)
cd frontend && npm install && npx ng serve

# Use the CLI
node cli/cli.js help
node cli/cli.js add https://example.com/long/url
node cli/cli.js ls
node cli/cli.js open <code>

# Build / assemble the bundle
node scripts/build-bundle.mjs            # build + commit (no push)
node scripts/build-bundle.mjs --push     # build + commit + push all branches
```

## Edit → push → pointer-bump workflow

Changes on a source branch only reach `main` (and the Docker image) after
the submodule pointer on `main` is bumped:

```
1.  cd backend          # or frontend/ or cli/
    # ... make changes ...
    git commit -m "fix: …" && git push

2.  # Back in the superproject root:
    node scripts/build-bundle.mjs --push
    # — or manually:
    git submodule update --remote backend
    git add backend
    git commit -m "chore: bump backend pointer"
    git push origin main
```

`build-bundle.mjs --push` does steps 2+ for all three source branches at once
and also rebuilds + commits the `bundle` branch.

## CI automation

| Workflow | Trigger | Action |
|----------|---------|--------|
| `bundle.yml` "Build bundle" | Hourly cron + `workflow_dispatch` | Runs `build-bundle.mjs --push` |
| `docker.yml` "Build and push image" | Push to `main` touching `bundle` or the workflow file | Builds `./bundle/Dockerfile` → `ghcr.io/<owner>/<repo>:latest` + `:sha-<sha>` |

---

## Do / Don't rules (non-obvious traps)

### ❌ Never hand-edit `bundle/`
`bundle/` is assembled by `scripts/build-bundle.mjs` and overwritten on every
CI run.  To change what ends up in the bundle, edit the source:
`backend/server.js`, `cli/cli.js`, `frontend/src/`, or the assembly logic in
`scripts/build-bundle.mjs` itself.

### ❌ Do not add `"type":"module"` near `cli.js`
`cli/cli.js` uses CommonJS `require()` throughout.  `cli/package.json`
deliberately has **no `"type"` field**.  `bundle/package.json` also omits it
for the same reason — `cli.js` is copied into `bundle/` and must run under
plain `node`.  Converting to ESM would break both.

### ❌ Do not rename the Angular project or change `outputPath`
`scripts/build-bundle.mjs` hardcodes `dist/snip-frontend/browser/` as the
source for `bundle/public/`.  The project name in `angular.json` **must stay
`snip-frontend`** so the build lands at exactly that path.  Changing it breaks
the assembly step.

### ❌ Do not add a persistent store
`backend/server.js` stores links in a plain JS `Map`.  Restarting clears all
links.  This is intentional — the backend is a zero-dependency demo server.
Do not add a database or file persistence without a deliberate product decision.

### ❌ Do not add a `push` trigger to `bundle.yml`
GitHub runs a push-triggered workflow from the file **on the branch that was
pushed**.  `bundle.yml` only exists on `main`, so a push to `backend`,
`frontend`, or `cli` would never find it.  The hourly cron is the correct
mechanism for picking up changes on those branches.

### ❌ Do not change `paths: [bundle, …]` to `bundle/**` in `docker.yml`
The `bundle` entry in `docker.yml`'s `paths` filter watches the `bundle`
**submodule pointer** (a gitlink entry in `main`'s tree).  The files _inside_
`bundle/` are not part of `main`'s tree at all.  Using `bundle/**` would never
match and the Docker workflow would never fire on bundle updates.
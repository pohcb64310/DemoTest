# Snip

A tiny URL shortener built as **three independent layers**, each on its own
orphan branch of this repository and composed here as git submodules.

```
snip-demo (main)
├── backend/    ← Bun server          (branch: backend)
├── frontend/   ← Angular 19 SPA      (branch: frontend)
└── cli/        ← Zero-dep Node CLI   (branch: cli)
```

## API Contract

All three clients talk to the same backend over HTTP.

| Method | Path          | Body                       | Success response                                          |
|--------|---------------|----------------------------|-----------------------------------------------------------|
| `POST` | `/api/links`  | `{ "url": "https://…" }`   | `201` `{ code, url, shortUrl, hits, createdAt }`          |
| `GET`  | `/api/links`  | —                          | `200` array of link objects                               |
| `GET`  | `/:code`      | —                          | `302` → original URL &nbsp;·&nbsp; `404` if unknown       |

`shortUrl` is `<BASE_URL>/<code>` where `BASE_URL` defaults to
`http://localhost:3000`. Codes are 6 random base-62 characters.

## Branch & Submodule Layout

| Branch     | What lives there                                             |
|------------|--------------------------------------------------------------|
| `main`     | This README and `.gitmodules` (superproject only)            |
| `backend`  | `server.js`, `package.json`, `README.md`                     |
| `frontend` | Angular app — `src/`, `angular.json`, `tsconfig*`, …        |
| `cli`      | `cli.js`, `snip` / `snip.cmd` / `snip.ps1`, `package.json`  |

Each submodule folder in `main` is just a *pointer* (commit SHA) into the
corresponding branch of the same repository.

## Cloning

A plain `git clone` leaves the submodule folders empty.
Always clone with:

```sh
git clone --recurse-submodules https://github.com/pohcb64310/DemoTest
```

Already cloned without the flag?

```sh
git submodule update --init --recursive
```

## Running All Three Pieces

### 1 · Backend (Bun)

```sh
cd backend
bun run server.js        # or: bun start
# → http://localhost:3000
```

| Env var               | Default                          | Description                     |
|-----------------------|----------------------------------|---------------------------------|
| `PORT`                | `3000`                           | Port to listen on               |
| `BASE_URL`            | `http://localhost:<PORT>`        | Origin used in `shortUrl`       |
| `RAILWAY_PUBLIC_DOMAIN` | —                              | Auto-detected Railway domain    |
| `PUBLIC_DIR`          | —                                | Serve static files from folder  |

### 2 · Frontend (Angular SPA)

```sh
cd frontend
npm install
npx ng serve             # dev server at http://localhost:4200
```

The app talks to `http://localhost:3000` — start the backend first.

Production build:

```sh
npx ng build             # output → dist/snip-frontend/browser/
```

### 3 · CLI

```sh
cd cli
npm link                 # or: npm install -g .
snip help

snip add https://example.com/very/long/path
snip ls
snip open <code>
```

Set `SNIP_API=http://…` to point at a non-local backend.

## Update Workflow

After making changes inside a submodule, commit and push there as normal:

```sh
cd backend
# … edit files …
git add -A
git commit -m "fix: …"
git push
```

Then bump the superproject pointer so `main` tracks the new commit:

```sh
cd ..                                   # back to superproject root
git submodule update --remote backend   # fetch latest & advance pointer
git add backend
git commit -m "chore: bump backend to <short-sha>"
git push
```

To update all submodules at once:

```sh
git submodule update --remote
git add backend frontend cli
git commit -m "chore: bump all submodules"
git push
```
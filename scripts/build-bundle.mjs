#!/usr/bin/env node
/**
 * scripts/build-bundle.mjs
 *
 * Assembles the Snip "bundle" branch from the three source branches:
 *   backend  → server.js
 *   frontend → Angular SPA build output (→ bundle/public)
 *   cli      → cli.js
 *
 * Usage:
 *   node scripts/build-bundle.mjs           # build + commit (no push)
 *   node scripts/build-bundle.mjs --push    # build + commit + push
 *
 * Safe no-op: when sources have not changed since the last run, git
 * commits are skipped.  With --push, any already-committed-but-unpushed
 * work is still pushed.
 */

import { execSync }                              from 'child_process';
import { existsSync, cpSync, mkdirSync,
         writeFileSync, rmSync }                from 'fs';
import { join, dirname }                         from 'path';
import { fileURLToPath }                         from 'url';

// ── Paths ─────────────────────────────────────────────────────────────────────
const ROOT     = dirname(dirname(fileURLToPath(import.meta.url)));
const BACKEND  = join(ROOT, 'backend');
const FRONTEND = join(ROOT, 'frontend');
const CLI_DIR  = join(ROOT, 'cli');
const BUNDLE   = join(ROOT, 'bundle');
const PUBLIC   = join(BUNDLE, 'public');
const NODE     = process.execPath;          // full path — avoids wrapper issues
const PUSH     = process.argv.includes('--push');

// On Windows, Git for Windows may not be in the inherited PATH; add it.
const GIT_WIN  = 'C:\\Program Files\\Git\\cmd';
const PATH_EXT = process.platform === 'win32' && !process.env.PATH.includes(GIT_WIN)
  ? `;${GIT_WIN}`
  : '';
const BASE_ENV = {
  ...process.env,
  PATH: process.env.PATH + PATH_EXT,
  NG_CLI_ANALYTICS: 'false',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function run(cmd, cwd = ROOT) {
  console.log(`\n  $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd, shell: true, env: BASE_ENV });
}

function capture(cmd, cwd = ROOT) {
  return execSync(cmd, { encoding: 'utf8', cwd, shell: true, env: BASE_ENV }).trim();
}

function hasStagedChanges(cwd) {
  return capture('git diff --cached --name-only', cwd).length > 0;
}

function step(n, title) {
  const bar = '═'.repeat(56);
  console.log(`\n${bar}\n  Step ${n}: ${title}\n${bar}`);
}

// ── Step 1: Update source submodules to their remote branch tips ──────────────
step(1, 'Update source submodules');
run('git submodule update --init --remote backend frontend cli');

// ── Step 2: Build the Angular frontend ───────────────────────────────────────
step(2, 'Build frontend (npm install + ng build)');

run('npm install', FRONTEND);

// Ensure esbuild native binary is present (may be blocked by npm allow-scripts)
const esbuildInstall = join(FRONTEND, 'node_modules', 'esbuild', 'install.js');
if (existsSync(esbuildInstall)) {
  try {
    execSync(`"${NODE}" "${esbuildInstall}"`, {
      cwd: FRONTEND, stdio: 'ignore', env: BASE_ENV
    });
  } catch { /* already installed */ }
}

const NG_BIN = join(FRONTEND, 'node_modules', '@angular', 'cli', 'bin', 'ng.js');
run(`"${NODE}" "${NG_BIN}" build`, FRONTEND);

const INDEX_HTML = join(FRONTEND, 'dist', 'snip-frontend', 'browser', 'index.html');
if (!existsSync(INDEX_HTML)) {
  console.error(`\n  ERROR: ${INDEX_HTML} not found — build failed`);
  process.exit(1);
}
console.log(`\n  ✓ Build output verified: index.html present`);

// ── Step 3: Assemble bundle/ ──────────────────────────────────────────────────
step(3, 'Assemble bundle/');

// Wipe and recreate public/ each run.
// Git uses content hashes: identical files produce an empty diff → safe no-op.
if (existsSync(PUBLIC)) rmSync(PUBLIC, { recursive: true, force: true });
mkdirSync(PUBLIC, { recursive: true });

cpSync(join(BACKEND, 'server.js'), join(BUNDLE, 'server.js'));
cpSync(join(CLI_DIR, 'cli.js'),    join(BUNDLE, 'cli.js'));
cpSync(join(FRONTEND, 'dist', 'snip-frontend', 'browser'), PUBLIC, { recursive: true });
console.log('  ✓ Copied server.js, cli.js, frontend build → public/');

// .env — Bun auto-loads this; flips server into "serve the SPA too" mode
writeFileSync(join(BUNDLE, '.env'), 'PUBLIC_DIR=./public\n');

// package.json — deliberately no "type" field so cli.js runs under plain node
writeFileSync(join(BUNDLE, 'package.json'), JSON.stringify({
  name: 'snip-bundle',
  version: '1.0.0',
  description: 'Snip — assembled backend + frontend + CLI (generated, do not edit)',
  scripts: { start: 'bun server.js' },
  engines: { bun: '>=1.0.0' }
}, null, 2) + '\n');

// Dockerfile
writeFileSync(join(BUNDLE, 'Dockerfile'), [
  'FROM oven/bun:1-alpine',
  'WORKDIR /app',
  'COPY . .',
  'ENV PORT=3000',
  'ENV PUBLIC_DIR=./public',
  'EXPOSE 3000',
  'CMD ["bun", "server.js"]',
  ''
].join('\n'));

// .dockerignore — exclude secrets + junk; ENV is set in the Dockerfile instead
writeFileSync(join(BUNDLE, '.dockerignore'), [
  '.env',
  'node_modules',
  '.git',
  ''
].join('\n'));

// railway.json — Dockerfile builder (Railway detects it automatically)
writeFileSync(join(BUNDLE, 'railway.json'), JSON.stringify({
  $schema: 'https://railway.app/railway.schema.json',
  build:  { builder: 'DOCKERFILE' },
  deploy: { startCommand: 'bun server.js', healthcheckPath: '/api/links' }
}, null, 2) + '\n');

console.log('  ✓ Wrote .env, package.json, Dockerfile, .dockerignore, railway.json');

// ── Step 4: Commit inside bundle/ ────────────────────────────────────────────
step(4, 'Commit bundle/');
run('git add -A', BUNDLE);

if (hasStagedChanges(BUNDLE)) {
  const beSha  = capture('git rev-parse --short HEAD', BACKEND);
  const feSha  = capture('git rev-parse --short HEAD', FRONTEND);
  const cliSha = capture('git rev-parse --short HEAD', CLI_DIR);
  run(`git commit -m "build: backend@${beSha} frontend@${feSha} cli@${cliSha}"`, BUNDLE);
  console.log('  ✓ bundle/ committed');
} else {
  console.log('  bundle/: nothing to commit');
}

// Always push when --push — handles previously-committed-but-not-yet-pushed runs
if (PUSH) {
  run('git push origin HEAD:bundle', BUNDLE);
  console.log('  ✓ bundle branch pushed');
} else {
  console.log('  (run with --push to push bundle)');
}

// ── Step 5: Bump superproject submodule pointers ──────────────────────────────
step(5, 'Bump superproject');
run('git add .gitmodules backend frontend cli bundle', ROOT);

if (hasStagedChanges(ROOT)) {
  run('git commit -m "chore: bump submodule pointers"', ROOT);
  console.log('  ✓ superproject committed');
} else {
  console.log('  superproject: nothing to commit');
}

if (PUSH) {
  run('git push origin main', ROOT);
  console.log('  ✓ main pushed');
} else {
  console.log('  (run with --push to push main)');
}

step('Done', '');
console.log(`  Bundle: ${BUNDLE}`);
console.log(`  Push:   ${PUSH ? 'YES — branches pushed' : 'NO  — re-run with --push to publish'}`);
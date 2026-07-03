#!/usr/bin/env node
'use strict';

const { spawn }         = require('child_process');
const { get: httpGet }  = require('http');
const { get: httpsGet } = require('https');

const BASE = (process.env.SNIP_API || 'http://localhost:3000').replace(/\/$/, '');

// ── entry point ──────────────────────────────────────────────────────────────
async function main() {
  const [cmd, ...rest] = process.argv.slice(2);

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    usage(); return;
  }

  if      (cmd === 'add')  await cmdAdd(rest);
  else if (cmd === 'ls')   await cmdLs();
  else if (cmd === 'open') await cmdOpen(rest);
  else die('Unknown command "' + cmd + '". Run: snip help');
}

// ── snip add <url> ────────────────────────────────────────────────────────────
async function cmdAdd([url]) {
  if (!url) die('Usage: snip add <url>');
  let res;
  try {
    res = await fetch(BASE + '/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
  } catch (err) { die('Backend unreachable -- ' + err.message); }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) die('Error ' + res.status + ': ' + (body.error || res.statusText));
  console.log(body.shortUrl);
}

// ── snip ls ───────────────────────────────────────────────────────────────────
async function cmdLs() {
  let res;
  try { res = await fetch(BASE + '/api/links'); }
  catch (err) { die('Backend unreachable -- ' + err.message); }
  if (!res.ok) die('Error ' + res.status + ': ' + res.statusText);

  const links = await res.json();
  if (!links.length) { console.log('No links yet.'); return; }

  const cW = Math.max(4, ...links.map(function(l){ return l.code.length; }));
  const hW = Math.max(4, ...links.map(function(l){ return String(l.hits).length; }));
  function row(c, h, u) {
    return String(c).padEnd(cW) + '  ' + String(h).padStart(hW) + '  ' + u;
  }
  console.log(row('CODE', 'HITS', 'URL'));
  console.log('-'.repeat(cW) + '  ' + '-'.repeat(hW) + '  ' + '-'.repeat(52));
  links.forEach(function(l){ console.log(row(l.code, l.hits, l.url)); });
}

// ── snip open <code> ──────────────────────────────────────────────────────────
async function cmdOpen([code]) {
  if (!code) die('Usage: snip open <code>');
  let target;
  try { target = await resolveShortCode(code); }
  catch (err) { die(err.message); }
  openInBrowser(target);
  console.log('Opening ' + target);
}

/**
 * GETs /:code without following the redirect and returns the Location value.
 * Uses http/https directly because global fetch (undici) wraps 3xx into an
 * opaque response that hides the Location header.
 */
function resolveShortCode(code) {
  return new Promise(function(resolve, reject) {
    const u   = new URL('/' + encodeURIComponent(code), BASE);
    const req = (u.protocol === 'https:' ? httpsGet : httpGet)(
      u.href,
      { headers: { 'User-Agent': 'snip-cli/1.0' } },
      function(res) {
        res.resume();
        if (res.statusCode === 404)
          return reject(new Error('Unknown code: ' + code));
        if (res.statusCode >= 300 && res.statusCode < 400) {
          var loc = res.headers['location'];
          if (loc) return resolve(loc);
          return reject(new Error('Redirect had no Location header'));
        }
        reject(new Error('Unexpected status ' + res.statusCode));
      }
    );
    req.on('error', function(e){ reject(new Error('Backend unreachable -- ' + e.message)); });
    req.end();
  });
}

function openInBrowser(url) {
  var p = process.platform;
  var cmd  = p === 'win32'  ? 'cmd'      : p === 'darwin' ? 'open'     : 'xdg-open';
  var args = p === 'win32'  ? ['/c','start','',url] : [url];
  spawn(cmd, args, { stdio: 'ignore', detached: true }).unref();
}

// ── helpers ───────────────────────────────────────────────────────────────────
function usage() {
  console.log([
    'snip -- tiny URL shortener CLI',
    '',
    'Usage:',
    '  snip add <url>    Shorten a URL and print the short link',
    '  snip ls           List all links (code / hits / original URL)',
    '  snip open <code>  Open a short link in the system browser',
    '  snip help         Show this message',
    '',
    'Environment:',
    '  SNIP_API   Backend base URL  (default: http://localhost:3000)',
  ].join('\n'));
}

function die(msg) {
  process.stderr.write('snip: ' + msg + '\n');
  process.exit(1);
}

main().catch(function(err){ die(err.message || String(err)); });
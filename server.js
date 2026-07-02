// Snip — tiny URL shortener  (single-file Bun server, zero npm deps)

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const BASE_URL = (
  process.env.BASE_URL ??
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${PORT}`)
).replace(/\/$/, '');

const PUBLIC_DIR = process.env.PUBLIC_DIR ?? null;

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/** @type {Map<string, {code:string, url:string, shortUrl:string, hits:number, createdAt:string}>} */
const links = new Map();

function generateCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => BASE62[b % 62]).join('');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });

async function tryStatic(pathname) {
  if (!PUBLIC_DIR) return null;
  const filePath =
    pathname === '/' ? `${PUBLIC_DIR}/index.html` : `${PUBLIC_DIR}${pathname}`;
  const file = Bun.file(filePath);
  return (await file.exists()) ? new Response(file, { headers: CORS }) : null;
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

Bun.serve({
  port: PORT,

  async fetch(req) {
    const { pathname } = new URL(req.url);
    const method = req.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // POST /api/links — create a short link
    if (method === 'POST' && pathname === '/api/links') {
      let body;
      try {
        body = await req.json();
      } catch {
        return json({ error: 'Invalid JSON' }, 400);
      }

      if (typeof body?.url !== 'string') {
        return json({ error: 'url is required and must be a string' }, 400);
      }

      let parsed;
      try {
        parsed = new URL(body.url);
      } catch {
        return json({ error: 'Invalid URL' }, 400);
      }

      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return json({ error: 'URL must use http or https' }, 400);
      }

      let code;
      do { code = generateCode(); } while (links.has(code));

      const link = {
        code,
        url: body.url,
        shortUrl: `${BASE_URL}/${code}`,
        hits: 0,
        createdAt: new Date().toISOString(),
      };
      links.set(code, link);
      return json(link, 201);
    }

    // GET /api/links — list all links
    if (method === 'GET' && pathname === '/api/links') {
      return json([...links.values()]);
    }

    // GET — static file wins over a same-named short code
    if (method === 'GET') {
      const staticRes = await tryStatic(pathname);
      if (staticRes) return staticRes;

      if (pathname.length > 1) {
        const code = pathname.slice(1);
        const link = links.get(code);
        if (link) {
          link.hits++;
          return new Response(null, {
            status: 302,
            headers: { Location: link.url, ...CORS },
          });
        }
      }
    }

    return new Response('Not Found', { status: 404, headers: CORS });
  },
});

console.log(`Snip listening on ${BASE_URL} (port ${PORT})`);

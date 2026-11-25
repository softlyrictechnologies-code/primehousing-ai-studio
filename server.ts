import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const distDir = path.resolve(__dirname, 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');
const port = Number(process.env.PORT) || 3000;

const ASSET_EXTENSION_RE =
  /\.(?:js|mjs|cjs|ts|tsx|jsx|css|scss|less|map|json|svg|ico|png|jpe?g|webp|gif|avif|bmp|tiff?|woff2?|ttf|eot|otf|pdf|txt|xml|wasm|webmanifest)$/i;

const STATIC_MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.cjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

const EXACT_FRONTEND_ROUTES = new Set([
  '/',
  '/properties',
  '/submit-land',
  '/about',
  '/contact',
  '/admin',
  '/admin/login',
  '/admin/submissions',
  '/admin/properties',
  '/admin/projects',
  '/admin/enquiries',
  '/admin/locations',
  '/admin/content',
]);

function normalizeRoutePath(reqPath: string): string {
  if (!reqPath || reqPath === '/') return '/';
  return reqPath.replace(/\/+$/, '') || '/';
}

function isValidFrontendRoute(reqPath: string): boolean {
  const normalized = normalizeRoutePath(reqPath);
  if (EXACT_FRONTEND_ROUTES.has(normalized)) {
    return true;
  }
  if (/^\/properties\/[^/]+$/.test(normalized)) {
    return true;
  }
  if (/^\/projects\/[^/]+$/.test(normalized)) {
    return true;
  }
  return false;
}

app.set('trust proxy', true);
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/healthz', (_req, res) => {
  res.status(200).send('ok');
});

if (fs.existsSync(distDir)) {
  app.use(
    express.static(distDir, {
      index: false,
      setHeaders(res, filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = STATIC_MIME_TYPES[ext];
        if (mimeType) {
          res.setHeader('Content-Type', mimeType);
        }

        if (ext === '.html') {
          res.setHeader('Cache-Control', 'no-cache');
        } else if (
          filePath.includes(`${path.sep}assets${path.sep}`) &&
          /-[A-Za-z0-9_-]{6,}\.[^.]+$/.test(path.basename(filePath))
        ) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=3600');
        }
      },
    })
  );
}

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(404).send('Not found');
    return;
  }

  if (
    req.path.startsWith('/assets/') ||
    req.path.startsWith('/src/') ||
    ASSET_EXTENSION_RE.test(req.path) ||
    !isValidFrontendRoute(req.path)
  ) {
    res.status(404).send('Not found');
    return;
  }

  if (fs.existsSync(indexHtmlPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexHtmlPath);
    return;
  }

  res.status(503).send('Application build not found.');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
});

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
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
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
  if (fs.existsSync(indexHtmlPath)) {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexHtmlPath);
    return;
  }
  res.status(503).send('Application build not found.');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
});

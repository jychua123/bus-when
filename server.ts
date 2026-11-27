import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import busArrivalHandler from './api/busarrival.ts';
import healthHandler from './api/health.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  app.disable('x-powered-by');

  // Mount serverless handlers locally for Express dev & full-stack preview
  app.get('/api/health', (req, res) => {
    healthHandler(
      { method: req.method, query: req.query as Record<string, string | string[] | undefined> },
      res
    );
  });

  app.get('/api/busarrival', (req, res) => {
    void busArrivalHandler(
      { method: req.method, query: req.query as Record<string, string | string[] | undefined> },
      res
    );
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SG BusTime server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

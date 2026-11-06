import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './src/server/api.ts';
import { initDirectories, initSchema } from './src/server/db.ts';
import { seedDatabase } from './src/server/seed.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Ensure directories and schema exist
  initDirectories();
  initSchema();
  await seedDatabase(false);

  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Mount API router
  app.use('/api', apiRouter);

  if (!isProduction) {
    // Development mode: Mount Vite middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    console.log(`[SoftClinch SAP Support Desk] Vite development middleware attached.`);
  } else {
    // Production mode: Serve built static files
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log(`[SoftClinch SAP Support Desk] Serving static production build from ${distPath}`);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SoftClinch SAP Support Desk] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[SoftClinch SAP Support Desk] Failed to start server:', err);
  process.exit(1);
});

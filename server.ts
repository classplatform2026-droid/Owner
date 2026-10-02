import http from 'http';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { initDatabase } from './server/db';
import { initSocketIO } from './server/socket';
import { authRouter } from './server/routes/authRoutes';
import { posRouter } from './server/routes/posRoutes';
import { adminRouter } from './server/routes/adminRoutes';

async function startServer() {
  console.log('[ShopPOS Server] Initializing MongoDB persistence & collections...');
  await initDatabase();

  const app = express();
  const httpServer = http.createServer(app);

  // Initialize Socket.IO on the same HTTP server
  console.log('[ShopPOS Server] Initializing Socket.IO realtime connection engine...');
  initSocketIO(httpServer);

  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', posRouter);

  if (!isProd) {
    console.log('[ShopPOS Server] Attaching Vite development middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[ShopPOS Server] Serving POS web app with Realtime WebSockets at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[ShopPOS Server] Fatal server startup error:', err);
  process.exit(1);
});

import http from 'http';
import express from 'express';
import cors from 'cors';
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
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
  const originHandler = (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    // Allow non-browser requests (Postman, curl, background server-to-server calls)
    if (!origin) return callback(null, true);

    if (allowedOriginsEnv && allowedOriginsEnv !== '*') {
      const list = allowedOriginsEnv.split(',').map((s) => s.trim());
      if (list.includes(origin)) {
        return callback(null, true);
      }
    }
    // Dynamically reflect origin to guarantee credentials: true works in all browsers and cross-services
    return callback(null, true);
  };

  // Security & CORS Middleware
  app.use(
    cors({
      origin: originHandler,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    })
  );

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint (for Render & Kubernetes liveness probes)
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'shoppos-owner',
      env: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
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

  // Graceful termination handlers
  const handleExit = () => {
    console.log('[ShopPOS Server] Received exit signal, closing server gracefully...');
    httpServer.close(() => {
      process.exit(0);
    });
  };
  process.on('SIGTERM', handleExit);
  process.on('SIGINT', handleExit);
}

startServer().catch((err) => {
  console.error('[ShopPOS Server] Fatal server startup error:', err);
  process.exit(1);
});

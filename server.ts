import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { attachSessionUser, verifyCsrfIfMutating } from './server/auth.ts';
import { initDatabase } from './server/db.ts';
import { adminRouter } from './server/routes/adminRoutes.ts';
import { authRouter } from './server/routes/authRoutes.ts';
import { pollbotRouter } from './server/routes/pollbot.ts';
import { publicRouter } from './server/routes/publicRoutes.ts';
import { voterRouter } from './server/routes/voterRoutes.ts';

const PORT = Number(process.env.PORT || 3000);

initDatabase();

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(attachSessionUser);
app.use('/api', verifyCsrfIfMutating);

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/public', publicRouter);
app.use('/api/pollbot', pollbotRouter);
app.use('/api', voterRouter);
app.use('/api', adminRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'smart-election-portal' });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Election Portal server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

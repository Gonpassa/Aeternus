import express, { Express } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import sessionMiddleware from './config/session';
import passport from './config/passport';
import authRouter from './auth/routes';
import journalRouter from './modules/journal/routes';
import config from './config/default';

const defaultClientDistPath = path.resolve(__dirname, '../../client/dist');

export const createApp = (options: { clientDistPath?: string } = {}): Express => {
  const { clientDistPath = defaultClientDistPath } = options;
  const app = express();

  if (config.nodeEnv === 'production') {
    // Fly's edge proxy terminates TLS and forwards over plain HTTP internally, so without this
    // Express never sees the request as secure and express-session silently drops the session
    // cookie (cookie.secure: true in config/session.ts refuses to set it over an "insecure" connection).
    app.set('trust proxy', 1);
  }

  app.use(cors());
  app.use(express.json());
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  app.use('/api/auth', authRouter);
  app.use('/api/journal', journalRouter);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  return app;
};

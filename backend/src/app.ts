import express, { Express } from 'express';
import cors from 'cors';
import sessionMiddleware from './config/session';
import passport from './config/passport';

export const createApp = (): Express => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
};

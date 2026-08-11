import express, { Express } from 'express';
import cors from 'cors';
import sessionMiddleware from './config/session';
import passport from './config/passport';
import authRouter from './auth/routes';
import journalRouter from './modules/journal/routes';

export const createApp = (): Express => {
  const app = express();

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

  return app;
};

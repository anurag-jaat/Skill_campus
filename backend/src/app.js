import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { db } from './db/index.js';
import { env, isDev } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

/**
 * Implementation file for app.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '500kb' }));
  app.use(morgan(isDev ? 'dev' : 'combined'));

  /** Render pings this to check the service is alive. */
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      env: env.nodeEnv,
      database: db.kind,
      mailDriver: env.mail.driver,
    });
  });

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

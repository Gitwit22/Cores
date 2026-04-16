import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.routes.js';
import { capabilitiesRouter } from './routes/capabilities.routes.js';
import { parseRouter } from './routes/parse.routes.js';
import { classifyRouter } from './routes/classify.routes.js';
import { extractRouter } from './routes/extract.routes.js';
import { processRouter } from './routes/process.routes.js';
import { specializedRouter } from './routes/specialized.routes.js';
import { exportRouter } from './routes/export.routes.js';
import { contactsRouter } from './routes/contacts.routes.js';
import { schemasRouter } from './routes/schemas.routes.js';
import { requestLogger } from './middleware/requestLogger.js';
import { serviceAuth } from './middleware/serviceAuth.js';
import { errorHandler } from './middleware/errorHandler.js';

const ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [];

export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    cors({
      origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type'],
    })
  );
  app.use(requestLogger);
  app.use(express.json({ limit: '1mb' }));

  app.use(healthRouter);
  app.use(schemasRouter);
  app.use(serviceAuth);
  app.use(capabilitiesRouter);
  app.use(parseRouter);
  app.use(classifyRouter);
  app.use(extractRouter);
  app.use(processRouter);
  app.use(specializedRouter);
  app.use(exportRouter);
  app.use(contactsRouter);

  app.use(errorHandler);
  return app;
}

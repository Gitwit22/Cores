import express from 'express';
import { healthRouter } from './routes/health.routes.js';
import { capabilitiesRouter } from './routes/capabilities.routes.js';
import { parseRouter } from './routes/parse.routes.js';
import { classifyRouter } from './routes/classify.routes.js';
import { extractRouter } from './routes/extract.routes.js';
import { processRouter } from './routes/process.routes.js';
import { requestLogger } from './middleware/requestLogger.js';
import { serviceAuth } from './middleware/serviceAuth.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(express.json({ limit: '1mb' }));

  app.use(healthRouter);
  app.use(serviceAuth);
  app.use(capabilitiesRouter);
  app.use(parseRouter);
  app.use(classifyRouter);
  app.use(extractRouter);
  app.use(processRouter);

  app.use(errorHandler);
  return app;
}

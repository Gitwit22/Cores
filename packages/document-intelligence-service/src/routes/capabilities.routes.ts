import { Router } from 'express';
import { listCapabilities } from '../core/document-intelligence/registry.js';

const capabilitiesRouter = Router();

capabilitiesRouter.get('/capabilities', (_req, res) => {
  res.json({
    providers: listCapabilities(),
  });
});

export { capabilitiesRouter };

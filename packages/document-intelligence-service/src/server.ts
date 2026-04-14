import { createApp } from './app.js';
import { ensureTempDirectory } from './utils/tempFiles.js';

async function start(): Promise<void> {
  await ensureTempDirectory();

  const app = createApp();
  const port = Number(process.env.PORT) || 3000;

  app.listen(port, () => {
    console.info(`[doc-intel-service] listening on port ${port}`);
  });
}

void start().catch((error) => {
  console.error('[doc-intel-service] failed to start', error);
  process.exit(1);
});

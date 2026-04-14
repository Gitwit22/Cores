import { LlamaCloud } from '@llamaindex/llama-cloud';
import { DocumentIntelligenceConfigError } from '../../errors.js';

let llamaClient: LlamaCloud | null = null;

function requireLlamaApiKey(): string {
  const key = process.env.LLAMA_CLOUD_API_KEY;
  if (!key || key.trim() === '') {
    throw new DocumentIntelligenceConfigError(
      'LLAMA_CLOUD_API_KEY is required to use the Llama Cloud provider.',
    );
  }
  return key.trim();
}

export function getLlamaCloudClient(): LlamaCloud {
  if (llamaClient) {
    return llamaClient;
  }

  llamaClient = new LlamaCloud({ apiKey: requireLlamaApiKey() });
  return llamaClient;
}

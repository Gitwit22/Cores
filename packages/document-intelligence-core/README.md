# @nxtlvl/document-intelligence-core

Provider-agnostic document intelligence core for Nxt Lvl applications.

Centralizes document **parsing**, **classification**, and **extraction** behind a stable internal API so app code never depends directly on a specific AI/document provider.

## Current provider

**Llama Cloud** — active working provider via `@llamaindex/llama-cloud`.  
The architecture is intentionally provider-agnostic; Llama Cloud can be swapped or augmented with additional providers in the future without changing application business logic.

## Public API

```ts
import {
  parseDocument,
  classifyDocument,
  extractDocument,
  processDocument,
} from '@nxtlvl/document-intelligence-core';
```

### `parseDocument(input, options?)`

Upload and parse a file; returns a `NormalizedParseResult`.

### `classifyDocument(input, options?)`

Classify a document into a known type; returns a `NormalizedClassificationResult`.

### `extractDocument(input, schema, options?)`

Run schema-driven field extraction; returns a `NormalizedExtractionResult`.

### `processDocument(input, options)`

Pipeline runner — parse → classify → extract in one call.  
Supports `parse`, `classify`, and `extract` flags via `ProcessDocumentOptions`.

## Configuration

Set the following environment variable before invoking any capability:

```
LLAMA_CLOUD_API_KEY=<your-key>
```

Additional settings are managed via `DocumentIntelligenceConfig` (see `src/config.ts`).

## Architecture

```
document-intelligence-core/
  src/
    index.ts              ← public exports
    types.ts              ← normalized provider-agnostic types
    errors.ts             ← structured error classes
    config.ts             ← centralized config & feature toggles
    registry.ts           ← provider resolution
    orchestrator.ts       ← processDocument pipeline
    providers/
      base.ts             ← DocumentIntelligenceAdapter interface
      llamaCloud/
        client.ts         ← Llama Cloud SDK client (singleton)
        adapter.ts        ← capability wiring for Llama Cloud
        parse.ts          ← parse implementation
        classify.ts       ← classify implementation
        extract.ts        ← extract implementation
    normalizers/
      parseNormalizer.ts
      classifyNormalizer.ts
      extractNormalizer.ts
    services/
      parseDocument.ts
      classifyDocument.ts
      extractDocument.ts
      processDocument.ts
```

## Adding a new provider

1. Create `src/providers/<yourProvider>/adapter.ts` implementing `DocumentIntelligenceAdapter`.
2. Register the provider in `src/registry.ts`.
3. Add the provider name to the `DocumentIntelligenceProvider` union in `src/types.ts`.

App code needs no changes as long as the normalized result types are preserved.

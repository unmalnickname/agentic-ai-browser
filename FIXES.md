# FIXES.md

## Overview
This document summarizes the critical defects that blocked `agentic-ai-browser` from building and running, the corrective actions taken, and how you can validate or extend the fixes.

| # | Problem | Symptom | Resolution |
|---|---------|---------|------------|
| 1 | **Missing export** in `browserExecutor.ts` | Web-UI build throws “_executeAction is not exported from browserExecutor.js_” | Implemented `executeAction` wrapper (re-uses existing action handlers) and added `export` statement.|
| 2 | **TypeScript errors** in `server.ts` | `tsc` failed with `TS1362`, `string \| null` incompatibilities | Refactored imports (`WebSocketServer`), tightened null checks, and cast literals to satisfy strict‐null-checks. Build now passes. |
| 3 | **LLM provider initialization** ignored `LLM_PROVIDER` env | Running with `LLM_PROVIDER=claude` crashed due to missing `GEMINI_API_KEY` | Replaced eager imports with **lazy dynamic imports** inside `initializeLLMProcessor()` so only the chosen provider’s module is loaded. |
| 4 | **Regression safety harness** | No automated regression | Added `test-fixes.sh` – compiles TypeScript, spins up Web-UI, and sanity-runs in *Claude* mode to assert Gemini is **never** required. |

---

## Detailed Fix Notes

### 1. Export Error (`browserExecutor.ts`)
* **Root cause** – The file defined `executeAction` logic privately; Web-UI expected it publicly.
* **Fix**  
  ```ts
  // src/browserExecutor.ts
  export async function executeAction(page: Page, action: Action): Promise<boolean> { … }
  ```
  All action handler imports (`clickHandler`, `inputHandler`, …) are wired so the Web UI can dispatch any action over WebSocket.

### 2. TypeScript Build Break (`server.ts`)
* Replaced
  ```ts
  import WebSocket, { Server as WebSocketServer } from 'ws';
  ```
  with two distinct imports because `Server` is a **type-only export** in `ws` v8:
  ```ts
  import WebSocket from 'ws';
  import { WebSocketServer } from 'ws';
  ```
* Added explicit **null checks** on `sessionId` and casted `process.env` reads to `string`.
* Result: `npm run build` / `npx tsc` completes without errors.

### 3. LLM Provider Initialization
* **Old behaviour**: All provider modules were eagerly imported at top-level causing Gemini validation even when not selected.
* **New approach**
  ```ts
  async function initializeLLMProcessor(): Promise<LLMProcessor> {
      switch (process.env.LLM_PROVIDER?.toLowerCase()) {
        case 'openai': return (await import('./llmProcessorOpenAI.js')).openaiProcessor;
        …
      }
  }
  ```
* Only the module chosen by `LLM_PROVIDER` (default **ollama**) is loaded; other env keys are ignored.

---

## How to Test the Fixes

### Automated Validation

1. **Make the script executable**
   ```bash
   chmod +x ./test-fixes.sh
   ```
2. **Run**
   ```bash
   ./test-fixes.sh
   ```
   The script performs:
   * Clean build (`npx tsc`) & assert `executeAction` export exists.
   * Starts Web-UI on port **3333**, hits `/api/sessions`, then shuts down.
   * Launches CLI with temporary **Claude** env verifying **Gemini** is not referenced.
   * Reports **All tests completed successfully!** on pass.

Logs are written to `./logs/test-fixes.log`.

### Manual Smoke-test
```bash
npm run build           # ensure fresh dist
LLM_PROVIDER=openai     node dist/index.js          # CLI mode with OpenAI
LLM_PROVIDER=gemini     node dist/index.js          # Gemini
LLM_PROVIDER=claude     node dist/index.js          # Claude
LLM_PROVIDER=ollama     node dist/index.js          # Local Ollama
PORT=3000 npm run start:web   # Launch Web-UI (reads .env)
```
> For provider-specific keys, copy `.env.example` → `.env` and fill only the section you need.

---

## Starting with Different LLM Providers

| Provider | Pre-requisites | Quick start |
|----------|----------------|-------------|
| **OpenAI** | `OPENAI_API_KEY` | `LLM_PROVIDER=openai node dist/index.js` |
| **Gemini** | `GEMINI_API_KEY` | `LLM_PROVIDER=gemini node dist/index.js` |
| **Claude** | `CLAUDE_API_KEY`, `CLAUDE_API_URL` | `LLM_PROVIDER=claude node dist/index.js` |
| **Ollama (local)** | Ollama running & model pulled | `LLM_PROVIDER=ollama node dist/index.js` |
| **DeepSeek** | DeepSeek proxy key (`OPENAI_API_KEY`) | `LLM_PROVIDER=deepseek node dist/index.js` |
| **OpenRouter** | `OPENROUTER_API_KEY` | `LLM_PROVIDER=openrouter node dist/index.js` |

For Web-UI:
```bash
# .env controls the provider
npm run build
npm run start:web
```

---

## Next Steps
* **CI integration** – hook `test-fixes.sh` into GitHub Actions.
* **Provider unit tests** – mock each SDK to ensure isolation.
* **Strict eslint rules** – prevent accidental eager imports of providers.

Enjoy a smooth build & run experience! If any new provider needs to be added, follow the dynamic import pattern shown in `initializeLLMProcessor()`.

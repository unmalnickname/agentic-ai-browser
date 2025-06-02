# AI-GUIDELINES.md  
Agent-centric rules & patterns for working on **Agentic-AI-Browser**.  
Read top-to-bottom once, then keep nearby—most answers you need are here.

---

## 1. Project Vision & High-Level Architecture
* Goal: a single autonomous agent that uses Playwright + LLM to control a Chromium browser, extract data, and accomplish user goals.
* Layers (outside-in):
  1. **Web UI / CLI** – human entrypoints (`src/server.ts`, `src/index.ts`).
  2. **Automation Graph** – state-machine orchestration (`src/automation.ts`, `core/automation/`).
  3. **LLM Processors** – provider adapters (`core/llm/`).
  4. **Action Handling** – click/input/etc. (`core/action-handling/handlers/`).
  5. **Page Analysis** – DOM snapshot & extractors (`core/page/`).
  6. **Utilities & Persistence** – logging, success patterns, user functions.

Vision mantra: **“Smaller model, smarter system.”** We rely on smart caching, modular code, and rich context—not brute force.

---

## 2. Modularity Rules
1. One concept per file; soft cap **400 tokens** / **~120 lines**.
2. No cyclic imports—use interface injection or event bus if needed.
3. Folder = module boundary. New domain logic → create a sub-folder.
4. Cross-module communication only through:
   * Public functions/Types in `index.ts`
   * Events (`logger.browser.action`)
   * The shared `GraphContext` interface
5. NEVER hard-code provider or UI details in core layers.

---

## 3. AI-Friendly Coding Patterns
| Pattern | Rationale | How to Apply |
|---------|-----------|--------------|
| **Flat Objects** | Easier JSON extraction | Prefer `{selector, text}` over classes with getters. |
| **Verbose keys** | Improves self-describing JSON | Use `type`, `element`, `value` not `t,e,v`. |
| **Predictable order** | Boosts LLM parsing | Keep parameter order consistent across providers. |
| **Chunkable logs** | Context window safe | Split long strings ≥2k chars; use `logger.chunk()`. |
| **Deterministic IDs** | Re-execution parity | Inputs → SHA1 if they must be stable across runs. |

---

## 4. Adding Features Consistently
Checklist before PR:
1. Create new folder/module.
2. Unit test in `src/__tests__`.
3. Add docs in relevant `README` or update this file.
4. Integrate with state machine via `registerState`.
5. Log new actions under a unique `logger.browser.action` key.
6. Update `.env.example` if env vars introduced.
7. Keep PR description ≤300 words; link to design doc if larger.

---

## 5. Working with LLM Providers
1. Adapter lives in `core/llm/llmProcessor<Provider>.ts`.
2. Extend `BaseLLMProcessor` and override only `processPrompt`.
3. **Mandatory env vars** listed at top; validate on load and `throw` if absent.
4. Respect retry logic: call `this.pruneContextIfNeeded()` on token errors.
5. Return **raw text**; do not parse JSON inside adapter.
6. Add `npm run start:<provider>` and `<provider>.sh/.ps1` launchers.

---

## 6. Browser Automation Flow (TL;DR)
```text
init session → chooseAction → (click|input|navigate|wait|scroll|notes|sendHumanMessage)
     ↑               │
     └── retry / feedback ◄── failureHandler
```
Principles:
* Every state mutates `GraphContext` only; never global vars.
* Handlers must return next state string.
* Verification helpers (`verifyAction`, `verifyElementExists`) run **before** Playwright calls.

---

## 7. UI Development Guidelines
* Public assets => `public/`; served by Express static middleware.
* Use vanilla JS + minimal CDN CSS (no heavy frameworks).
* Components ≤200 LOC; if larger, split into modules under `public/js/`.
* WebSocket message schema:
  ```json
  { "type": "session_update" | "sessions_list" | "error", "session": {...} }
  ```
* Any new UI action must have corresponding `/api/sessions/:id/command` route.

---

## 8. Documentation Standards
* Every folder with >2 files has a local `README.md` (≤200 words) explaining purpose & public API.
* High-level docs live at root (`README.md`, `USER-MANUAL.md`, `DEVELOPERS-GUIDE.md`).
* AI-targeted docs (like this file) favor:
  * Bullet lists over prose.
  * Deterministic headings.
  * Examples before theory.
* Update the **Table-of-Docs** section in root `README.md` when adding files.

---

## Quick Reference
* Run tests: `npm run test:safe`
* Build: `npm run build`
* Start Web UI: `npm run start:web`
* Launch headless automation: `HEADLESS=true npm run start:openai`
* Stop agent programmatically: `await stopAgent()`

Keep this file in sync with reality—AI agents rely on it as their “mental map.”  
Happy hacking! 🚀

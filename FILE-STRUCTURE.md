# FILE-STRUCTURE.md  
Guide to organising **Agentic AI Browser** source code so humans *and* AI agents can find things fast, keep modules small, and prevent context-bloat.

---

## 1. Top-Level Layout

| Path                         | Purpose                                                    |
|------------------------------|------------------------------------------------------------|
| `/src`                       | All application source code (TypeScript).                  |
| `/src/core`                  | Engine code independent of UI / CLI.                       |
| `/src/core/automation`       | State-machine, context manager, milestones, progress.      |
| `/src/core/action-handling`  | One handler per browser action (click, input, …).          |
| `/src/core/llm`              | Provider adapters (`llmProcessor<Provider>.ts`).            |
| `/src/core/page`             | DOM extractors and analyzers.                              |
| `/src/core/elements`         | Element-finding strategies & verifier.                     |
| `/src/utils`                 | Pure helpers (logger, agentState, etc.).                   |
| `/src/server.ts`             | Express + WebSocket backend for Web UI.                    |
| `/public`                    | Static assets served by `/src/server.ts` (HTML, JS, CSS).  |
| `/tests` or `/src/__tests__` | Jest unit and integration tests.                           |
| `/scripts/*.sh` `*.ps1`      | Startup / build helpers per provider / platform.           |
| `/docs`                      | Long-form documentation (this file, AI guides, etc.).      |
| `/logs` `/screenshots`       | Runtime artefacts (never imported by code).                |

> Rule of thumb: **runtime → `src`**, **reference → `docs`**, **artefacts → root folders**.

---

## 2. Organisation Rules

1. **One concept per file** – soft cap ≈120 LOC / 400 tokens.  
2. **Feature folder over layer folder** inside `core/` (e.g., page extractors live with page logic).  
3. No cyclic imports; higher layer may import lower, never vice-versa.  
4. Public API of a folder re-exported through an `index.ts` at that level.  
5. UI code (HTML/JS/CSS) never imports from Playwright layer directly—communicate via WebSocket API.  
6. Tests mirror source path and file name:  
   `src/core/page/extractor/elements.ts` → `src/__tests__/core/page/extractor/elements.test.ts`.

---

## 3. Naming Conventions

| Item            | Pattern                          | Example                                   |
|-----------------|----------------------------------|-------------------------------------------|
| Directory       | `kebab-case`                     | `user-functions`, `state-management`      |
| TS File         | `verbNoun.ts`                    | `verifyAction.ts`, `getPageState.ts`      |
| Test File       | `*.test.ts`                      | `pageAnalyzer.test.ts`                    |
| Provider Adapter| `llmProcessor<Provider>.ts`      | `llmProcessorClaude.ts`                   |
| React/Alpine UI | `PascalCase.tsx` or `.js`        | `SessionCard.js`                          |
| Env variables   | `SCREAMING_SNAKE`                | `OPENAI_API_KEY`                          |
| Interfaces      | `PascalCase`                     | `GraphContext`, `BrowserSession`          |

---

## 4. File Placement Cheatsheet

| Code Type                 | Folder                                   |
|---------------------------|------------------------------------------|
| State machine, graph flow | `src/core/automation`                    |
| Browser action handlers   | `src/core/action-handling/handlers`      |
| LLM provider adapters     | `src/core/llm`                           |
| Success-pattern storage   | `src/successPatterns.ts`                 |
| Pure utilities            | `src/utils`                              |
| Web UI server/API         | `src/server.ts` (+ helpers in `src/api`) |
| Static front-end assets   | `public/`                                |
| User function templates   | `src/core/user-functions`                |
| Unit tests                | `src/__tests__/…`                        |
| Shell/PS launchers        | `scripts/*.sh`, `scripts/*.ps1`          |
| Long-form docs            | `docs/`                                  |

*If unsure, place new code under the **closest feature folder** then expose public surface in its `index.ts`.*

---

## 5. Import / Export Guidelines

1. **Barrel first** – import from folder `index.ts` not deep file paths:  
   ```ts
   // Good
   import { PageAnalyzer } from '@/core/page';
   // Bad
   import { PageAnalyzer } from '@/core/page/analyzer';
   ```
2. UI layer must use REST/WebSocket, never `import` server or Playwright modules.
3. Cross-cutting utils exposed via `src/utils/index.ts`.
4. Avoid default exports except for React components; use named exports for clarity.

---

## 6. Best Practices

* Keep browser-automation logic pure; no UI side-effects.  
* Move heavy vendor code (SDKs) to provider folders to localise dependencies.  
* When adding new provider/test/util ⇒ update barrel `index.ts`.  
* Favour composition over inheritance—adapters extend `BaseLLMProcessor`, handlers are flat functions.  
* Write DOCS alongside code (`README.md` in folder when >2 files).  
* Delete dead files early; empty folders banned in main branch.

---

## 7. Example: Correct File Organisation

```
src/
├─ core/
│  ├─ llm/
│  │  ├─ llmProcessorOpenAI.ts
│  │  ├─ llmProcessorClaude.ts
│  │  └─ index.ts             ← re-exports processors
│  ├─ action-handling/
│  │  ├─ handlers/
│  │  │  ├─ clickHandler.ts
│  │  │  ├─ scrollHandler.ts
│  │  │  └─ index.ts
│  │  └─ types.ts
│  ├─ page/
│  │  ├─ analyzer.ts
│  │  ├─ extractor/
│  │  │  ├─ elements.ts
│  │  │  └─ content.ts
│  │  └─ index.ts
│  └─ automation/
│     ├─ machine.ts
│     ├─ context.ts
│     └─ milestones.ts
├─ utils/
│  ├─ logger.ts
│  └─ index.ts
├─ server.ts
├─ index.ts
└─ __tests__/
   └─ core/
      └─ llm/
         └─ llmProcessorOpenAI.test.ts
```

This layout lets an AI assistant load only the folder barrels (`index.ts`) to gain a full mental map without opening every file, keeping token usage low.

---

### Keep This Guide Updated  
Any structural change **must** update this document in the same PR – it’s the contract between humans, CI, and AI assistants.  
Happy organising! 📂✨

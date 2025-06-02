# AI-AGENT-PATTERNS.md  
_Practical patterns & guard-rails for evolving the Agentic-AI-Browser without breaking its core design._

---

## 1. State-Machine Architecture

| Layer | Responsibility | Key Files |
|-------|----------------|-----------|
| **State Registry** | Maps state-names ➜ async handlers | `core/automation/machine.ts` |
| **GraphContext** | Shared, mutable session data | `browserExecutor.ts` |
| **State Handlers** | Atomic behaviours (click, input…) | `core/action-handling/handlers/*` |

```
start → setupBrowser → chooseAction
        ↘                 ↙
     (click|input|…) ← wait
                ↓
        handleFailure ↔ sendHumanMessage
                ↓
             terminate
```

Rules  
1. **Single responsibility** – handler mutates only its own concern.  
2. **Return value = nextState string** – _never_ call another handler directly.  
3. **Registration order** is irrelevant; `registerState(name, fn)` handles collisions.

---

## 2. DOM Processing Pipeline

1. `PageAnalyzer.extractSnapshot(page)`  
2. **Extractors** (`core/page/extractor/*`) produce:
   * `elements.buttons|links|inputs`
   * `content.summary`
   * `flags.contentTruncated / contentScrolled`
3. Result stored on `PageState`, then serialized into the LLM prompt.

Guidelines  
- Never send full HTML; keep raw text ≤ 8 K chars.  
- Prefer semantic selectors: `aria/role`, id, href → fallback to CSS.  
- When modifying extractors keep token impact in mind (see §4).

---

## 3. Decision-Making Patterns

Implemented via `BaseLLMProcessor.generateNextAction()`.

Pattern Steps  
1. Build **system prompt** + **dynamic prompt**  
2. Call adapter `processPrompt()`  
3. Parse JSON → `Action` via `ActionExtractor`  
4. Verify selector (`verifyElementExists`) **before** Playwright call.

Best Practices  
- Put _all_ browser instructions inside JSON—no free-text commands.  
- If extraction fails, auto-convert long reply → `sendHumanMessage`.  
- Use **wait scoping**: `wait(maxWait: 2000)` instead of blind sleeps.

---

## 4. Context Management & Pruning

Objects stored in memory:
- `ctx.history`    – raw action log  
- `ctx.compressedHistory` – last 50 actions squashed  
- `this.lastContext` (LLM side) – alternating user/assistant messages

Pruning Rules  
```
if lastContext.length > 2 && tokenLimitHit:
    keep last 50%
```
Tips  
- Use `logger.debug({promptLength})` to watch growth.  
- Keep success notes in **SuccessPatterns** (disk), not in prompt.  

---

## 5. Error Recovery & Handling

| Scenario | State Route | Pattern |
|----------|-------------|---------|
| Playwright error | → `handleFailure` | Retry same action `n<=2` then escalate |
| Selector not found | verifyAction❌ | Back to `chooseAction` with `retries++` |
| Repetition detected | `isRedundantAction()` | Auto-inject `wait` **or** ask human |
| Captcha / Wall | `sendHumanMessage` | Prompt user; pause automation |

Handler Template
```ts
registerState("click", async ctx => {
  const ok = await verifyAction(ctx);
  if (!ok) return "handleFailure";
  // …perform click
  return "chooseAction";
});
```

---

## 6. Behavioural Caching (Success Patterns)

File: `successPatterns.json` (auto-created)

```
{
  "stackoverflow.com": [
    { "selector": "button.js-accept", "type": "click" }
  ]
}
```

Write Flow  
`verifyAction ✅` → push to `ctx.successfulActions` → `SuccessPatterns.save(domain)`  

Read Flow  
During `chooseAction` suggestions appended to `ctx.actionFeedback`.

Extension Tip:  keep entries small; truncate to last **100** per domain.

---

## 7. Extending the Agent

| Task | Where to Add | Checklist |
|------|--------------|-----------|
| **New LLM Provider** | `core/llm/llmProcessorX.ts` | extend `BaseLLMProcessor`, env-vars, add npm script |
| **New Browser Action** | `core/action-handling/handlers/` | create handler, `registerState`, update JSON schema in processors |
| **New Extractor** | `core/page/extractor/` | export `extract(page): Partial<PageSnapshot>`; update analyzer |
| **New UI Command** | `server.ts` & `public/js` | API `POST /command`, WebSocket event |

_Always add_: unit test, docs snippet, env vars to `.env.example`.

---

## 8. Example: Well-Formed Agent Code

```ts
// core/action-handling/handlers/scrollHandler.ts
import { registerState } from '../machine.js';
import { GraphContext } from '../../../browserExecutor.js';

registerState("scroll", async (ctx: GraphContext) => {
  if (!ctx.action || ctx.action.type !== 'scroll') return "handleFailure";

  const direction = ctx.action.direction === 'up' ? -1 : 1;
  await ctx.page?.mouse.wheel(0, 500 * direction);

  ctx.history.push(`Scrolled ${ctx.action.direction}`);
  ctx.lastActionSuccess = true;
  ctx.retries = 0;

  return "chooseAction";
});
```

Why good?  
✔ Single concern  
✔ Updates context explicitly  
✔ Logs action for SuccessPatterns  
✔ Returns deterministic next state

---

## 9. Golden Rules (TL;DR)

1. **No side-effects outside GraphContext**.  
2. **One JSON schema to rule them all** – keep LLM output stable.  
3. **Fail fast, recover smart** – escalate after 2 identical failures.  
4. **Persist knowledge, not noise** – use SuccessPatterns, not bigger prompts.  
5. **Modularity beats cleverness** – smallest diff that solves the problem wins.

_Read this file before writing code.  Future AI assistants (and humans) will thank you._ 🚀

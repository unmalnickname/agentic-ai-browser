# LLM-INTEGRATION-GUIDE.md  
_Authoritative playbook for adding **any** new Language-Model provider to Agentic-AI-Browser._

---

## 0. Quick Checklist
1. Create `src/core/llm/llmProcessor<Provider>.ts`  
2. Add env-vars to `.env.example` (+ Windows PS comments)  
3. Update provider switch in `src/automation.ts`  
4. Add npm script & launch shell/ps1 file  
5. Write unit test under `src/__tests__/core/llm`  
6. Document the provider in **README.md** & `LLM-PROVIDERS.md`  
7. Run `npm run lint && npm run test:safe`

---

## 1. Step-by-Step Integration

| Step | Command / Action | Outcome |
|------|------------------|---------|
| 1 | `touch src/core/llm/llmProcessorFoo.ts` | New adapter file created |
| 2 | Extend `BaseLLMProcessor` (see §2) | Gains shared logic |
| 3 | Implement `processPrompt()` | Sends prompt → provider |
| 4 | (Optional) override `getSystemPrompt()` | Custom system prompt |
| 5 | Export **singleton instance** `export const fooProcessor = new FooProcessor();` | Keeps memory/state local |
| 6 | Edit `src/automation.ts` switch-case → `case 'foo': llmProcessor = fooProcessor;` | Runtime selection |
| 7 | Add npm script `start:foo` & `start-foo.sh/ps1` | Easy launch |
| 8 | Add env vars in `.env.example` | Users can configure |
| 9 | Write tests (see §6) | CI passes |
| 10 | Update docs (see §7) | Consistency |

---

## 2. Code Template

```ts
// src/core/llm/llmProcessorFoo.ts
import dotenv from 'dotenv';
import { BaseLLMProcessor } from './BaseLLMProcessor.js';
import logger from '../../utils/logger.js';
dotenv.config();

const FOO_API_KEY   = process.env.FOO_API_KEY;
const FOO_BASE_URL  = process.env.FOO_BASE_URL  || 'https://api.foo.ai/v1';
const MODEL         = process.env.FOO_MODEL     || 'foo-large';

class FooProcessor extends BaseLLMProcessor {
  /** Provider-specific API call */
  protected async processPrompt(prompt: string, systemPrompt: string): Promise<string> {
    if (!FOO_API_KEY) {
      logger.error('FOO_API_KEY not set');
      return 'Error: Missing API key';
    }

    const payload = {
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...this.lastContext,                 // from Base class
        { role: 'user',   content: prompt }
      ]
    };

    try {
      const res = await fetch(`${FOO_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${FOO_API_KEY}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        // §4 error pattern
        return await this.handleApiError(data, prompt, systemPrompt);
      }

      const responseText = data.choices[0].message.content;
      this.updateContext(prompt, responseText);     // keep convo
      return responseText;

    } catch (err:any) {
      logger.error('Foo API network error', err);
      return 'Error communicating with Foo API';
    }
  }

  /** Optional helper for token errors */
  private async handleApiError(apiErr: any, prompt: string, sys: string) {
    if (apiErr.error?.message?.includes('context length')) {
      logger.warn('Token limit hit – pruning context');
      this.pruneContextIfNeeded();
      return this.processPrompt(prompt, sys);
    }
    logger.error('Foo API returned error', apiErr);
    return `Foo API error: ${apiErr.error?.message || 'Unknown'}`;
  }
}

export const fooProcessor = new FooProcessor();
```

Add to `automation.ts`:

```ts
import { fooProcessor } from './core/llm/llmProcessorFoo.js';
...
case 'foo':
  llmProcessor = fooProcessor;
  break;
```

---

## 3. Required Interfaces & Methods

| Interface / Method | Location | Purpose |
|--------------------|----------|---------|
| `LLMProcessor` | `src/core/llm/llmProcessor.ts` | `generateNextAction()` contract |
| `BaseLLMProcessor` | same folder | Shared context, pruning, logging |
| `processPrompt(prompt, systemPrompt)` | Your adapter | **Must** return raw text string |
| (Optional) `getSystemPrompt()` | override to supply custom system prompt |
| Export **singleton** instance | keeps memory between calls |

---

## 4. Error-Handling Patterns

1. **Missing Config**  
   ```ts
   if (!FOO_API_KEY) {
     logger.error('FOO_API_KEY missing');
     return 'Error: Foo API key not configured';
   }
   ```

2. **HTTP Error**  
   ```ts
   const res = await fetch(...);
   if (!res.ok) {
     const data = await res.json();
     // token limit recovery
     if (data.error.message.includes('context length')) {
        this.pruneContextIfNeeded();
        return this.processPrompt(prompt, systemPrompt);
     }
     return `Foo API error: ${data.error.message}`;
   }
   ```

3. **Network Exception** – wrap `fetch` in try/catch; return friendly string, log full stack.

4. **Parsing Failures** – if returned JSON ≠ expected, log + return generic error.

All error messages should be **English, plain-text** (no JSON) so upper layers fallback to `sendHumanMessage` gracefully.

---

## 5. Context Management

Use in-built helpers:

| Helper | What it does |
|--------|--------------|
| `this.lastContext` | Array<ConversationMessage>; previous turns |
| `this.updateContext(user, assistant)` | Pushes sanitized messages |
| `this.pruneContextIfNeeded()` | Halves context when invoked |
| `GraphContext` (automation layer) | Stores page snapshot, history, etc. |

Adapter **never** touches `GraphContext` directly—only the built-in conversation list.

---

## 6. Testing Requirements

1. **Unit Test** file under `src/__tests__/core/llm/llmProcessorFoo.test.ts`.
2. Mock `fetch` with `jest.fn()` and return minimal provider JSON.
3. Test cases:
   * Happy path → returns string, updates `lastContext`.
   * Token limit error → triggers `pruneContextIfNeeded`.
   * Missing API key → returns error string.
4. Lint & type-check pass (`npm run lint`, `npm run build`).

>  Tip: Use `jest.spyOn(global, 'fetch')` – see existing provider tests.

---

## 7. Documentation Standards

Add section to **README.md** + update `LLM-PROVIDERS.md`.

Minimum doc block:

```
### FooAI
- Configure in `.env`:
  ```
  LLM_PROVIDER=foo
  FOO_API_KEY=your-key
  FOO_MODEL=foo-large
  ```
- Start with: `npm run start:foo`
- Strengths / Drawbacks table row
```

Also append env-vars to `.env.example` & **WINDOWS-SETUP.md**.

---

## 8. Environment Variable Patterns

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `LLM_PROVIDER` | ✔ | `foo` | selects adapter |
| `FOO_API_KEY` | ✔ | `foo_sk_xxx` | Secret key |
| `FOO_BASE_URL` | ✖ | `https://api.foo.ai/v1` | Override for proxy |
| `FOO_MODEL` | ✖ | `foo-large` | Model name |
| Custom | ✖ | `FOO_TIMEOUT=30` | Provider-specific |

* Prefix with PROVIDER name to avoid collisions.*  
* Document defaults in code comments and `.env.example`.*

---

## 9. Example `.env.example` Additions

```
# FooAI Configuration
# LLM_PROVIDER=foo
FOO_API_KEY=
FOO_BASE_URL=https://api.foo.ai/v1
FOO_MODEL=foo-large
```

---

## 10. Reference Adapters

| Provider | File | Key Differences |
|----------|------|-----------------|
| **OpenAI**    | `llmProcessorOpenAI.ts` | Classic chat-completion format |
| **Gemini**    | `llmProcessorGemini.ts` | Uses Google SDK, schema objects |
| **Claude**    | `llmProcessorClaude.ts` | Uses `anthropic-version` header |
| **OpenRouter**| `llmProcessorOpenRouter.ts` | Adds `HTTP-Referer`, `X-Title` |
| **DeepSeek**  | `llmProcessorDeepSeek.ts` | OpenAI-compatible base-url override |

Start from the simplest (OpenAI style) if your provider is OpenAI-compatible; otherwise copy the Claude pattern.

---

## 11. Final Advice

* Keep adapter file **short & pure** – <300 LOC, no side-effects.  
* Lean on `BaseLLMProcessor`—avoid duplicating context logic.  
* Log generously (`logger.info/warn/error`); UI surfaces these.  
* Follow naming conventions (`llmProcessor<Provider>.ts`, env vars).  
* Write tests first; adapters often break on subtle API changes.  

_Adding a provider is straightforward when you follow this guide—now go integrate the next great model! 🚀_

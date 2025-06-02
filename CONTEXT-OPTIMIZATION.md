# CONTEXT-OPTIMIZATION.md  
_Keep your code (and prompts) small, sharp, and LLM-friendly._

These rules apply to every PR, script, and doc in **Agentic-AI-Browser**.  
Follow them and the agent – human _or_ machine – will always fit the important bits into its context window.

---

## 1. File-Organisation Best Practices
| Principle | Why it matters for LLMs | Action |
|-----------|-------------------------|--------|
| **One concept, one file** | Smaller files = cheaper chunk retrieval | Target ≤400 tokens / ≈120 loc per `.ts` |
| **Feature folders** | Fast semantic search | Group by domain (`core/llm/`, `core/page/`) not by layer |
| **Public index** | Clear import surface | Each folder exports public API via `index.ts`; hide internals |
| **Context tiering** | Prioritise access cost | Place “rarely read” assets under `docs/archives/` to keep index lean |

---

## 2. Code Chunking & Modularisation Rules
1. **100-line soft chunks** – split long utilities into discrete helpers.
2. **Pure functions first** – stateless helpers go to `/utils`; easy to embed inline in prompts.
3. **Interface isolation** – interact through small TypeScript interfaces not class hierarchies.
4. **No deep nesting** – max folder depth = 3; path length inflates prompt size.

---

## 3. Naming Conventions for Context Efficiency
| Element | Pattern | Example |
|---------|---------|---------|
| File     | `verbNoun.ts`            | `verifyAction.ts` |
| Folder   | `kebab-feature`          | `page-analyzer/` |
| Var      | short‐descriptive camel  | `maxWait`, `htmlRaw` |
| Types    | Pascal, suffix `Props`   | `ExtractorProps` |
| Env vars | SHOUT_CASE               | `OPENAI_BASE_URL` |

_Skip hungarian, prefixes, or redundant suffixes (`Helper`, `Util`), they bloat tokens._

---

## 4. Documentation Patterns
* **Front-load summary** (≤30 words), details after.
* Prefer **tables & lists** over prose.
* Use deterministic headings (`## Usage`, `## API`); LLM retrieval by section name.
* Link to source lines (`src/core/llm/...`) instead of pasting code in docs.
* Keep examples <120 tokens; reference extended samples in `/examples`.

---

## 5. Minimising Token Usage in Prompts
1. **Structured JSON only** – no freeform rationale inside prompts.
2. Replace boilerplate with **tokens** e.g. `UNIVERSAL_SUBMIT_SELECTOR`.
3. Truncate page content to ≤2 000 chars (`PageAnalyzer` already does this).
4. Strip whitespace & comments before sending to LLM.
5. Use **compressedHistory** (hash + diff) not full history when >5 items.

---

## 6. Context Pruning Techniques
| Situation | Action |
|-----------|--------|
| `token_limit` error from provider | `BaseLLMProcessor.pruneContextIfNeeded()` halves `lastContext`. |
| Repeated action loop detected    | Drop last 3 user/assistant pairs. |
| Large DOM                        | Auto-scroll, then keep **summary only**. |
| Long-running session (>50 steps) | Persist `SuccessPatterns` to disk, clear in-memory arrays. |

---

## 7. Testing Patterns for Context Limits
* **Tiny fixtures** – mock HTML snippets <300 tokens.
* **Table-driven tests** – loop over cases, single Jest file.
* **Snapshot size guard** – fail test if generated prompt >8 K chars.
* Split e2e specs by feature; run in parallel to avoid giant trace files.

---

## 8. Good vs Bad Examples

### Good (chunked, descriptive, minimal)
```ts
// core/page/extractor/title.ts  – 72 tokens
export const extractTitle = (doc: Document) => doc.title.trim();
```

### Bad (monolith, verbose)
```ts
// extractors.ts  – 1 200+ tokens
export function extractEverything(document) {
  /* many unrelated helpers mixed in */
}
```

---

### Quick Checklist Before Merge
- [ ] New/edited file <400 tokens?
- [ ] Folder contains `index.ts` exporting public API?
- [ ] No redundant words in names?
- [ ] Docs start with 1-sentence summary?
- [ ] Tests include prompt-size guard?

_If you tick all boxes, your change is context-safe. 🚀_

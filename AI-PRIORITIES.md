# AI-PRIORITIES.md  
Guide for autonomous & human contributors to align work on **Agentic AI Browser**

---

## 1. Current Development Priorities (Next ~3 Months)

| Rank | Theme | Why it Matters | Must-Have Deliverables |
|------|-------|----------------|------------------------|
| P1 | **Stability & Error Recovery** | Frequent runtime errors degrade trust. | • Retry/back-off wrapper for all LLM calls<br>• Playwright error taxonomy & handler<br>• 95% happy-path E2E test pass rate |
| P2 | **Provider Parity & Config DX** | Users switch providers easily. | • One-click `.env` generator<br>• Unified health-check CLI `npm run provider:test` |
| P3 | **Web-UI Usability** | Non-devs should drive agent visually. | • Live DOM preview pane<br>• Session export → Markdown report |
| P4 | **Success-Pattern Learning 2.0** | Leverage past wins to cut tokens. | • Scoring & eviction strategy<br>• UI toggle to inject/ignore patterns |
| P5 | **Context Efficiency** | Control cost + latency. | • Prompt size histogram in logs<br>• Auto-compress history >10 turns |

> AI agents: pick tickets from **top-down** unless a lower rank unblocks a critical path.

---

## 2. Long-Term Roadmap (6–18 Months)

1. **Multi-Tab / Parallel Tasks** – controlled fan-out without multi-agent complexity.  
2. **Headless Cloud Runner** – Docker image, GitHub Action for scheduled jobs.  
3. **Plugin Ecosystem** – user-land extractors, custom action packs.  
4. **Natural-Language Scripting DSL** – translate “scrape all job titles” → function calls.  
5. **Mobile Web Support** – emulate touch devices, viewport heuristics.

---

## 3. Inviolable Design Principles

1. **Single-Agent Simplicity** – one state machine, no orchestrated swarms.  
2. **Modular, 400-Token Files** – small, swappable units; see FILE-STRUCTURE.md.  
3. **LLM-Agnostic Core** – engine never cares which provider supplies the text.  
4. **Observable Everything** – every state, action, and API call logged.  
5. **Human-In-The-Loop Ready** – graceful escalation via `sendHumanMessage`.

---

## 4. Key Metrics of Success

| Category | Metric | Target |
|----------|--------|--------|
| Reliability | Session fatal error rate | < 3 % |
| Efficiency | Avg prompt size | ≤ 6 K chars |
| Learning | Re-used success patterns per session | ≥ 30 % |
| UX | Time-to-first-action in Web-UI | < 5 sec |
| Coverage | Supported provider adapters | ≥ 6 & green CI |

Metrics exposed via `/metrics.json` endpoint (todo).

---

## 5. Anti-Priorities (Do **Not** Spend Cycles On…)

* **Massive Model Fine-Tuning** – we leverage provider progress, not host heavy training.  
* **Monolithic Refactors** – avoid “big-bang” merges; prefer incremental slices.  
* **Visual-Only Automation** – stick to DOM-level fidelity, not pixel OCR.  
* **Exotic Front-End Frameworks** – keep Web-UI vanilla/optional.  
* **Multi-Agent Choreography** – violates principle #1 unless roadmap updates.

---

## 6. Decision-Making Framework

When choosing between two options an AI agent should evaluate in this order:

1. **Does it uphold the five design principles?**  
2. **Impact vs. Effort (ICE score)**  
   *Impact (1-5) × Confidence (0.5-1) / Effort (1-5)*  
3. **Context Footprint** – Will it increase prompt tokens or file size >400?  
4. **Reversibility** – Can we roll back with a git revert & no schema breaks?  
5. **Community Surface** – Does it require new docs, env vars, or UI affordances?

If tie persists → pick option with **less permanent complexity**.

---

## 7. Examples

### High-Quality Change ✨
```
+ core/page/extractor/table.ts (86 LOC)
+ tests/extractor/table.test.ts
+ docs updated
Effect: enables table parsing, adds <1 K tokens to codebase, passes all metrics.
```
• Small, isolated file  
• Unit-tested & documented  
• Improves success-pattern hit-rate

### Low-Quality Change 🚫
```
~ automation.ts +450 LOC
- Added inline HTML scraper
- Copied lodash entire source
No tests, prompt grew by 4 K tokens.
```
• Violates modular rule  
• Bloats context window  
• Hard to revert

---

### Quick Reference

* **Start a priority task**: create branch `feat/P1-description`  
* **Unsure?**: Ask via `sendHumanMessage` or check `AI-GUIDELINES.md`  
* **Metrics failing?**: treat as P1 bug.

_Every PR should state which priority or roadmap item it advances._ 🚀

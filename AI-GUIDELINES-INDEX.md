# 🔰 AI Guidelines Index

Welcome, autonomous & human collaborators!  
Start here to navigate all rules that keep **Agentic AI Browser** modular, context-friendly, and AI-ready.

| Doc | Purpose | When an AI assistant should open it |
|-----|---------|-------------------------------------|
| **AI-GUIDELINES.md** | Master principles (vision, modularity, context limits, documentation style). | First contact with the repo or whenever unsure about high-level rules. |
| **FILE-STRUCTURE.md** | Canonical folder & naming scheme. | Creating, moving, or deleting files/folders; reviewing PR paths. |
| **CONTEXT-OPTIMIZATION.md** | How to craft code/docs/prompts that fit LLM context windows. | Writing new code chunks, pruning prompts, investigating token errors. |
| **AI-AGENT-PATTERNS.md** | Recommended automation/state-machine patterns for agent logic. | Extending the agent workflow, adding new states or handlers. |
| **LLM-INTEGRATION-GUIDE.md** | Step-by-step playbook to add a new language-model provider. | Implementing or debugging any `llmProcessor<Provider>.ts`. |
| **AI-PRIORITIES.md** | Active roadmap, rank-ordered tasks, success metrics. | Choosing what to work on next; aligning autonomous PRs with strategy. |
| **WINDOWS-SETUP.md** | PowerShell scripts & setup for Windows contributors. | Running or testing on Windows, generating cross-platform scripts. |

---

## Recommended Reading Flow for New AI Agents

1. **Start with AI-GUIDELINES.md** → grasp vision & core rules.  
2. Skim **FILE-STRUCTURE.md** to know where everything lives.  
3. Consult **CONTEXT-OPTIMIZATION.md** before adding large code or prompts.  
4. Need to modify agent behaviour? → **AI-AGENT-PATTERNS.md**.  
5. Integrating a model? → **LLM-INTEGRATION-GUIDE.md**.  
6. Check **AI-PRIORITIES.md** to verify your change aligns with current roadmap.  
7. On Windows? → **WINDOWS-SETUP.md** for platform specifics.

---

## Quick Tips

- Keep new files under **400 tokens** and one clear purpose.
- Update this index **whenever** a new guideline document is added.
- If doubt persists, escalate via `sendHumanMessage` action per guidelines.

Happy automating! 🤖

# LLM Providers Guide

This document explains **all language-model providers currently supported by Agentic AI Browser**.  
Use it as a quick-reference when deciding which backend to run, how to configure it, and how to debug common issues.

---

## Quick Comparison

| Provider      | Hosted / Local | Default Model               | Strengths                              | Drawbacks                          |
|---------------|----------------|-----------------------------|----------------------------------------|------------------------------------|
| **OpenAI**    | SaaS          | `gpt-3.5-turbo` / `gpt-4o`  | Reliable, broad-coverage, tool calls   | Cost, rate limits, data residency |
| **Gemini**    | SaaS          | `gemini-2.0-flash` / Pro    | Fast JSON mode, generous context       | Strict quotas, region locked       |
| **Ollama**    | Local         | Any local GGUF (eg `llama3`) | Private, zero $ per token              | Requires >16 GB RAM, slower        |
| **Claude**    | SaaS          | `claude-3-haiku` / Sonnet   | Long context (200k), safe output       | Expensive at higher tiers          |
| **DeepSeek**  | SaaS          | `deepseek-chat`             | Coding tasks, cheap GPT-compatible     | Limited docs, smaller ecosystem    |
| **OpenRouter**| SaaS Gateway  | Proxy to 100+ models        | Model diversity, one API key           | 3rd-party billing, variable QoS    |

---

## 1. OpenAI

### Overview
OpenAI’s Chat Completion API is the most popular hosted LLM service and the **default** fallback in this project.

### Setup Steps
1. Create an account at <https://platform.openai.com>.
2. Generate a **secret key** and copy it.
3. In `.env` set:
   ```
   LLM_PROVIDER=openai
   OPENAI_API_KEY=sk-...
   LLM_MODEL=gpt-3.5-turbo       # or gpt-4o
   OPENAI_BASE_URL=https://api.openai.com/v1
   ```

### Required Environment Variables

| Variable          | Example                     | Notes                                  |
|-------------------|-----------------------------|----------------------------------------|
| `LLM_PROVIDER`    | `openai`                   | Enables this processor                 |
| `OPENAI_API_KEY`  | `sk-xxxxxxxx`              | **Mandatory**                          |
| `LLM_MODEL`       | `gpt-3.5-turbo`            | Any chat model name                    |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1`| Override for Azure/OpenAI-proxy        |

### Pros
- Battle-tested reliability & speed  
- Function-calling support  
- Broad community examples  

### Cons
- Paid usage; pricing increases above free tier  
- Data leaves your infra (unless Azure option)  
- 128k context only on premium models  

### Troubleshooting
| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| 401 Unauthorized | bad key, org mismatch | Re-issue key, re-export shell |
| `context length exceeded` | long history | Agent auto-prunes, but reduce goal or model |
| Socket timeout | network / proxy | Set `HTTP(S)_PROXY`, retry |

---

## 2. Gemini (Google)

### Overview
Gemini provides **structured JSON output** and extremely fast “flash” models. Great when latency matters.

### Setup Steps
1. Sign up at <https://aistudio.google.com> and enable **Generative AI API**.  
2. Copy the API key.
3. `.env`:
   ```
   LLM_PROVIDER=gemini
   GEMINI_API_KEY=AIza...
   LLM_MODEL=gemini-2.0-flash
   ```

### Environment Variables

| Variable        | Notes |
|-----------------|-------|
| `GEMINI_API_KEY`| Mandatory |
| `LLM_MODEL`     | `gemini-2.0-pro` for higher quality |

### Pros/Cons
+ Very low latency (flash)  
+ 32k context standard  
− Limited availability outside US/EU/APAC  
− No tool-calling parity with OpenAI yet  

### Tips
*Flash* models sometimes truncate JSON—upgrade to **Pro** for complex actions.

---

## 3. Ollama (Local Inference)

### Overview
Ollama runs GGUF/ggml models **locally** via an HTTP API; perfect for offline work or sensitive data.

### Setup
1. Install Ollama: <https://ollama.com>.
2. Pull a model, e.g. `ollama pull llama3`.
3. `.env`:
   ```
   LLM_PROVIDER=ollama
   OLLAMA_HOST=http://localhost:11434
   LLM_MODEL=llama3
   ```

| Variable     | Default | Description |
|--------------|---------|-------------|
| `OLLAMA_HOST`| `http://localhost:11434` | API endpoint |
| `LLM_MODEL`  | `llama3`| Model tag from `ollama list` |

### Pros/Cons
+ Zero variable cost, full privacy  
+ Works offline  
− Needs CPU/GPU RAM; latency seconds not ms  
− Model size limited by RAM/GPU VRAM  

### Troubleshooting
- **`connection refused`**: ensure `ollama serve` is running.  
- High RAM: use quantized variants (`llama3:8b-q4`).

---

## 4. Claude (Anthropic)

### Overview
Claude-3 models excel at **long-context reasoning** and safer outputs.

### Setup
1. Get key from <https://console.anthropic.com>.  
2. `.env`:
   ```
   LLM_PROVIDER=claude
   CLAUDE_API_KEY=claude_sk_...
   CLAUDE_MODEL=claude-3-haiku-20240307   # or sonnet/opus
   CLAUDE_MAX_TOKENS=4096
   ```

| Variable            | Notes |
|---------------------|-------|
| `CLAUDE_API_KEY`    | Mandatory |
| `CLAUDE_MODEL`      | haiku = cheap/fast, opus = best |
| `CLAUDE_API_URL`    | Usually default, override for proxies |

### Pros/Cons
+ 200k context on Opus  
+ Strict content filters, fewer surprises  
− Higher per-token cost  
− Occasional `usage_limit_reached` spikes  

### Tips
If you hit 400/429 errors, add client-side exponential back-off or upgrade quota.

---

## 5. DeepSeek

### Overview
DeepSeek offers Chat & Coder models **via an OpenAI-compatible endpoint**—great for code tasks.

### Setup
```
LLM_PROVIDER=deepseek
OPENAI_API_KEY=ds_sk_...
LLM_MODEL=deepseek-chat
OPENAI_BASE_URL=https://api.deepseek.com
```

### Pros
- GPT-style API: zero code changes  
- Low price, code-specialized model  

### Cons
- Newer platform, fewer uptime guarantees  
- Docs occasionally lag behind features  

### Troubleshooting
*Error: `invalid_api_key`* → ensure you’re using **DeepSeek** key, not OpenAI.

---

## 6. OpenRouter

### Overview
OpenRouter is a **gateway** exposing many vendor models behind a single key.

### Setup
1. Register at <https://openrouter.ai>.
2. Generate key.
3. `.env`:
   ```
   LLM_PROVIDER=openrouter
   OPENROUTER_API_KEY=or_k_...
   OPENROUTER_MODEL=openai/gpt-3.5-turbo   # any listing slug
   OPENROUTER_HTTP_REFERER=https://github.com/esinecan/agentic-ai-browser
   OPENROUTER_APP_TITLE=Agentic AI Browser
   ```

| Variable                 | Required | Purpose |
|--------------------------|----------|---------|
| `OPENROUTER_API_KEY`     | ✔        | Auth |
| `OPENROUTER_MODEL`       | ✔        | Pick any model slug |
| `OPENROUTER_HTTP_REFERER`| ✔        | Your site/repo (anti-abuse) |
| `OPENROUTER_APP_TITLE`   | ✔        | App id shown on dashboard |

### Pros
+ One-stop access to Claude, Gemini, Llama-3, etc.  
+ Competitive pricing / discounts  

### Cons
- Added hop = extra latency  
- Occasional model capacity errors—switch slug  

### Tips
If you see `model is currently overloaded`, automatically retry with alternate slug like `anthropic/claude-3-haiku`.

---

## General Best Practices

1. **Keep `.env` out of source control** – secrets should reside in a password manager or CI vault.  
2. **Tune `LLM_MODEL` per task**: flash/haiku for fast iteration, opus/4o for heavy reasoning.  
3. **Token Limits**: The agent already prunes context, but crafting a concise goal saves $$ and latency.  
4. **Retries & Back-offs**: Network/API hiccups are common—set `DEBUG_LEVEL=1` to inspect logs.  
5. **Version Pinning**: Cloud providers silently roll models—specify exact versions (`-20240515`).  
6. **Cost Monitoring**: Use provider dashboards; OpenRouter shows per-model spend.  
7. **Proxy Support**: set `HTTP_PROXY` / `HTTPS_PROXY` env vars for corporate networks.  
8. **Local vs Cloud**: Start with Ollama during dev, switch to cloud for production-grade throughput.  

---

## Troubleshooting Cheatsheet

| Error Snippet | Likely Fix |
|---------------|-----------|
| `ENOTFOUND api.openai.com` | Check VPN/DNS, corporate proxy |
| `rate_limit_exceeded` | Lower request rate, upgrade plan |
| `context_too_long` | Reduce goal, let agent scroll, or use long-context model |
| `connection refused` (Ollama) | Run `ollama serve` or correct `OLLAMA_HOST` |
| `usage_limit_reached` (Claude) | Wait 1-2 min or upgrade quota |
| `model overloaded` (OpenRouter) | Change slug or retry with back-off |

---

### Need Help?

• **Logs** live in `./logs` – look for `LLM request sent` and `LLM response`.  
• **Web UI** (`npm run start:web`) shows real-time stats, last error, and tokens.  
• Still stuck? Open an issue on GitHub with provider name, full error, and the last 20 log lines.

Happy automating!

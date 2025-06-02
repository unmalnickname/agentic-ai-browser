# Windows Setup Guide for Agentic AI Browser

Welcome, Windows users! This document walks you through installing, configuring, and running **Agentic AI Browser** on Windows 10/11 using PowerShell.  
These steps assume a fresh clone of the repository.

---

## 1. Prerequisites

| Requirement | Minimum Version | Download |
|-------------|-----------------|----------|
| **Node.js** | 18 LTS or newer | <https://nodejs.org/> |
| **Git**     | 2.30+          | <https://git-scm.com/> |
| **PowerShell** | 5.1+ (Windows Terminal recommended) | Built-in / <https://aka.ms/terminal> |
| **Chrome / Edge** (for Playwright) | Latest | <https://www.google.com/chrome/> / shipped with Windows |

> Optional for local LLM: **Ollama for Windows** (see Ollama docs).

---

## 2. Clone the Repository

```powershell
git clone https://github.com/esinecan/agentic-ai-browser.git
cd agentic-ai-browser
```

---

## 3. Install Dependencies & Build

```powershell
npm install        # installs Node packages
npm run build      # compiles TypeScript → dist/
```

Playwright will auto-download Chromium; if corporate firewalls block it, run:

```powershell
npx playwright install chromium
```

---

## 4. Configure Environment Variables

### 4.1 Create `.env`

Copy the template then edit in VS Code or Notepad:

```powershell
Copy-Item .env.example .env
```

Update keys and provider:

```
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
HEADLESS=false
```

### 4.2 Setting Vars Temporarily in PowerShell

Instead of editing `.env`, you can export vars for the current session:

```powershell
$Env:LLM_PROVIDER = "openai"
$Env:OPENAI_API_KEY = "sk-..."
```

They vanish when you close the shell.

### 4.3 Setting Vars Persistently (System GUI)

1. Search *Environment Variables* in Start Menu → **Edit the system environment variables**  
2. Click **Environment Variables…**  
3. Under **User variables** choose **New** → add `LLM_PROVIDER`, etc.  
4. Re-open any terminals to load changes.

---

## 5. PowerShell Start Scripts

Shell scripts provided in `*.sh` have Windows-friendly PowerShell versions below.  
Each command must be executed from the repo root **after** running `npm run build`.

| Target | Linux/Mac `.sh` | PowerShell Equivalent |
|--------|-----------------|-----------------------|
| **OpenAI** | `./start-openai.sh` | `powershell -NoProfile -Command "$Env:LLM_PROVIDER='openai'; node dist/index.js"` |
| **Gemini** | `./start-gemini.sh` | `$Env:LLM_PROVIDER='gemini'; node dist/index.js` |
| **Ollama** | `./start-ollama.sh` | `$Env:LLM_PROVIDER='ollama'; node dist/index.js` |
| **Claude** | `./start-claude.sh` | `$Env:LLM_PROVIDER='claude'; node dist/index.js` |
| **DeepSeek** | `./start-deepseek.sh` | `$Env:LLM_PROVIDER='deepseek'; $Env:OPENAI_BASE_URL='https://api.deepseek.com'; node dist/index.js` |
| **OpenRouter** | `./start-openrouter.sh` | `$Env:LLM_PROVIDER='openrouter'; node dist/index.js` |
| **Web UI** | `./start-web-ui.sh` | `npm run start:web` <sup>or</sup> `node dist/server.js` |

Tip: save any of the one-liners above as a `.ps1` file, e.g. `start-openai.ps1`, then double-click to run.

---

## 6. Running the Web UI

1. Ensure `PORT` is free (default **3000**).  
2. Start:

   ```powershell
   npm run start:web
   ```

3. Open <http://localhost:3000> to manage sessions visually.

If Windows Firewall prompts, allow access for Node.

---

## 7. Common Troubleshooting

| Issue | Fix |
|-------|-----|
| **“ps1 cannot be loaded because running scripts is disabled”** | Run PowerShell as Administrator:<br>`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| **Chromium executable not found** | Force install: `npx playwright install chromium` |
| **Proxy/SSL blocks model API** | Set `HTTP_PROXY` / `HTTPS_PROXY` in `.env` |
| **Long paths errors** | Enable long paths: `git config --system core.longpaths true` or Windows registry setting |

---

## 8. Updating the Project

```powershell
git pull
npm install
npm run build
```

---

## 9. Uninstall / Cleanup

```powershell
Remove-Item -Recurse -Force node_modules, dist, screenshots, logs
```

---

### Happy automating on Windows! 🎉

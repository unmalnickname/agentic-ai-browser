# Agentic AI Browser - OpenAI Launcher
# This script sets OpenAI as the LLM provider and starts the browser automation

# Display startup message
Write-Host "Starting Agentic AI Browser with OpenAI as the LLM provider..." -ForegroundColor Cyan
Write-Host "Make sure you have set your OPENAI_API_KEY in the .env file!" -ForegroundColor Yellow

# Set environment variables
$Env:LLM_PROVIDER = 'openai'

# Check if the dist directory exists (compiled TypeScript)
if (-Not (Test-Path -Path "dist/index.js")) {
    Write-Host "Error: Could not find compiled JavaScript. Please run 'npm run build' first." -ForegroundColor Red
    exit 1
}

# Run the application
try {
    Write-Host "Launching browser..." -ForegroundColor Green
    node dist/index.js
} catch {
    Write-Host "Error running the application: $_" -ForegroundColor Red
    exit 1
}

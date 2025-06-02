# Agentic AI Browser - Web UI Server Launcher
# This script compiles TypeScript if needed and starts the web UI server

# Display startup information
Write-Host "Building and starting the Agentic AI Browser Web UI..." -ForegroundColor Cyan

# Check if TypeScript is installed
try {
    $tscVersion = npm list -g typescript
    if (-not $tscVersion.Contains("typescript@")) {
        Write-Host "TypeScript is not installed globally. Checking local installation..." -ForegroundColor Yellow
        $localTsc = npm list typescript
        if (-not $localTsc.Contains("typescript@")) {
            Write-Host "Error: TypeScript compiler (tsc) not found." -ForegroundColor Red
            Write-Host "Please install TypeScript: npm install -g typescript" -ForegroundColor Red
            exit 1
        }
    }
} catch {
    Write-Host "Error checking TypeScript installation: $_" -ForegroundColor Red
    exit 1
}

# Build the TypeScript project
Write-Host "Compiling TypeScript code..." -ForegroundColor Green
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: TypeScript compilation failed." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error during build process: $_" -ForegroundColor Red
    exit 1
}

# Set environment variables
$Env:PORT = 3000

# Check if the server file exists
if (-Not (Test-Path -Path "dist/server.js")) {
    Write-Host "Error: Could not find compiled server.js. Build may have failed." -ForegroundColor Red
    exit 1
}

# Start the server
Write-Host "Starting web UI server on http://localhost:$($Env:PORT)..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Yellow

try {
    node dist/server.js
} catch {
    Write-Host "Error starting server: $_" -ForegroundColor Red
    exit 1
}

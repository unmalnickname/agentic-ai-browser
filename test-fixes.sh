#!/bin/bash

# Test script for agentic-ai-browser fixes
# This script verifies that our fixes for the following issues work correctly:
# 1. The missing export for executeAction in browserExecutor.js
# 2. The TypeScript build errors in server.ts
# 3. The LLM provider initialization loading Gemini regardless of which provider is selected

# Set up colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Set up variables
PROJECT_DIR="$(pwd)"
LOG_DIR="${PROJECT_DIR}/logs"
PID_FILE="/tmp/agentic-browser-test.pid"
WEB_PORT=3333 # Use a non-standard port for testing

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to log messages
log() {
  echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_DIR/test-fixes.log"
}

# Function to log errors
error() {
  echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >> "$LOG_DIR/test-fixes.log"
}

# Function to log warnings
warn() {
  echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1" >> "$LOG_DIR/test-fixes.log"
}

# Function to clean up processes
cleanup() {
  log "Cleaning up processes..."
  
  # Kill any running server processes
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null; then
      kill "$PID" 2>/dev/null
      log "Stopped process with PID: $PID"
    fi
    rm "$PID_FILE"
  fi
  
  # Kill any node processes that might be running our server
  pkill -f "node.*server.js" 2>/dev/null
  pkill -f "node.*index.js" 2>/dev/null
  
  log "Cleanup complete"
}

# Call cleanup on script exit
trap cleanup EXIT

# Function to build the project
build_project() {
  log "Building project with TypeScript compiler..."
  
  # Clean dist directory first
  if [ -d "dist" ]; then
    log "Cleaning dist directory..."
    rm -rf dist
  fi
  
  # Run TypeScript compiler
  npx tsc
  
  # Check if build was successful
  if [ $? -ne 0 ]; then
    error "TypeScript compilation failed"
    return 1
  fi
  
  # Check if key files exist
  if [ ! -f "dist/browserExecutor.js" ]; then
    error "browserExecutor.js was not generated"
    return 1
  fi
  
  if [ ! -f "dist/server.js" ]; then
    error "server.js was not generated"
    return 1
  fi
  
  # Verify executeAction export in browserExecutor.js
  if ! grep -q "export async function executeAction" "dist/browserExecutor.js"; then
    error "executeAction function is not exported in browserExecutor.js"
    return 1
  fi
  
  log "Build completed successfully"
  return 0
}

# Function to test the web UI server
test_web_ui() {
  log "Testing web UI server..."
  
  # Set environment variables for the test
  export PORT=$WEB_PORT
  
  # Start the server in the background
  node dist/server.js > "$LOG_DIR/web-server-test.log" 2>&1 &
  SERVER_PID=$!
  echo $SERVER_PID > "$PID_FILE"
  
  log "Started web server with PID: $SERVER_PID"
  
  # Wait for server to start (max 10 seconds)
  log "Waiting for server to start..."
  for i in {1..10}; do
    if curl -s "http://localhost:$WEB_PORT" > /dev/null; then
      log "Server is running"
      break
    fi
    
    if [ $i -eq 10 ]; then
      error "Server failed to start within timeout"
      cat "$LOG_DIR/web-server-test.log"
      return 1
    fi
    
    sleep 1
  done
  
  # Test API endpoint
  log "Testing API endpoint..."
  RESPONSE=$(curl -s "http://localhost:$WEB_PORT/api/sessions")
  
  if [[ "$RESPONSE" == *"sessions"* ]]; then
    log "API endpoint test passed"
  else
    error "API endpoint test failed"
    error "Response: $RESPONSE"
    return 1
  fi
  
  # Stop the server
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    kill "$PID"
    wait "$PID" 2>/dev/null
    rm "$PID_FILE"
    log "Stopped web server"
  fi
  
  log "Web UI server test completed successfully"
  return 0
}

# Function to test Claude mode without Gemini dependency
test_claude_mode() {
  log "Testing Claude mode without Gemini dependency..."
  
  # Create a temporary environment file with Claude configuration
  TEMP_ENV_FILE="/tmp/claude-test.env"
  cat > "$TEMP_ENV_FILE" << EOF
LLM_PROVIDER=claude
CLAUDE_API_KEY=test-key-not-real
CLAUDE_API_URL=https://api.anthropic.com/v1/messages
CLAUDE_MODEL=claude-3-haiku-20240307
CLAUDE_MAX_TOKENS=4096
HEADLESS=true
START_URL=https://example.com
EOF
  
  # Run the application with the temporary environment file
  log "Starting application in Claude mode..."
  GEMINI_ERROR_CHECK=$(NODE_OPTIONS="--max-old-space-size=4096" node -r dotenv/config dist/index.js dotenv_config_path="$TEMP_ENV_FILE" 2>&1 | grep -i "GEMINI_API_KEY" || true)
  
  # Check if there was an error related to GEMINI_API_KEY
  if [ -n "$GEMINI_ERROR_CHECK" ]; then
    error "Application still trying to load Gemini module in Claude mode"
    error "Error: $GEMINI_ERROR_CHECK"
    return 1
  fi
  
  # Clean up
  rm "$TEMP_ENV_FILE"
  
  log "Claude mode test completed successfully"
  return 0
}

# Main function
main() {
  log "Starting test script for agentic-ai-browser fixes"
  
  # Step 1: Build the project
  build_project
  if [ $? -ne 0 ]; then
    error "Build failed, aborting tests"
    exit 1
  fi
  
  # Step 2: Test the web UI server
  test_web_ui
  if [ $? -ne 0 ]; then
    error "Web UI server test failed"
    exit 1
  fi
  
  # Step 3: Test Claude mode
  test_claude_mode
  if [ $? -ne 0 ]; then
    error "Claude mode test failed"
    exit 1
  fi
  
  log "All tests completed successfully!"
  return 0
}

# Run the main function
main
exit $?

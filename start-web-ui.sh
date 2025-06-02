#!/bin/bash

# Display information
echo "Building and starting the Agentic AI Browser Web UI..."

# Check if TypeScript is installed
if ! command -v tsc &> /dev/null; then
    echo "Error: TypeScript compiler (tsc) not found."
    echo "Please install TypeScript: npm install -g typescript"
    exit 1
fi

# Build the TypeScript project
echo "Compiling TypeScript code..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "Error: TypeScript compilation failed."
    exit 1
fi

# Set environment variables
export PORT=3000

# Start the server
echo "Starting web UI server on http://localhost:${PORT}..."
echo "Press Ctrl+C to stop the server."
node dist/server.js

# Exit with the same code as the application
exit $?

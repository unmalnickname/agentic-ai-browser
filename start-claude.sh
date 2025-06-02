#!/bin/bash

# Set environment variables
export LLM_PROVIDER=claude

# Display information
echo "Starting Agentic AI Browser with Claude as the LLM provider..."
echo "Make sure you have set your CLAUDE_API_KEY in the .env file!"

# Run the application
node dist/index.js

# Exit with the same code as the application
exit $?

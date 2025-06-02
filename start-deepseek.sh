#!/bin/bash

# Set environment variables
export LLM_PROVIDER=deepseek

# Display information
echo "Starting Agentic AI Browser with DeepSeek as the LLM provider..."
echo "Make sure you have set your OPENAI_API_KEY in the .env file!"
echo "Also ensure OPENAI_BASE_URL is set to https://api.deepseek.com"

# Run the application
node dist/index.js

# Exit with the same code as the application
exit $?

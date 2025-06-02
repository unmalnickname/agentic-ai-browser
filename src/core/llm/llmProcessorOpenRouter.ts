import dotenv from 'dotenv';
import { BaseLLMProcessor, ConversationMessage } from "./BaseLLMProcessor.js";
import logger from '../../utils/logger.js';

dotenv.config();

// Configuration with environment variable fallbacks
const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-3.5-turbo";
const API_KEY = process.env.OPENROUTER_API_KEY;
const HTTP_REFERER = process.env.OPENROUTER_HTTP_REFERER || 'https://github.com/esinecan/agentic-ai-browser';
const APP_TITLE = process.env.OPENROUTER_APP_TITLE || 'Agentic AI Browser';

class OpenRouterProcessor extends BaseLLMProcessor {
  // No need to override getSystemPrompt() - using base class implementation
  
  protected async processPrompt(prompt: string, systemPrompt: string): Promise<string> {
    // Check for API key
    if (!API_KEY) {
      logger.error('OPENROUTER_API_KEY is not defined in environment variables');
      return "Error: OpenRouter API key not configured";
    }

    try {
      // Build the payload for OpenRouter API
      const payload = {
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...this.lastContext,
          { role: "user", content: prompt }
        ]
      };
    
      const result = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'HTTP-Referer': HTTP_REFERER,
          'X-Title': APP_TITLE
        },
        body: JSON.stringify(payload)
      });

      logger.info('LLM request sent to OpenRouter', {
        model: MODEL,
        contextLength: this.lastContext.length,
        requestText: prompt.substring(0, 100) + '...',
      });
      
      const response = await result.json();
      
      // Check for token limit errors
      if (response.error && (
          response.error.message?.includes("maximum context length") || 
          response.error.message?.includes("token") ||
          response.error.message?.includes("too long")
        )) {
        logger.warn('Hit token limit, pruning context and retrying', {
          error: response.error.message,
          contextLength: this.lastContext.length
        });
        
        // Axe half the context and try again
        this.pruneContextIfNeeded();
        return this.processPrompt(prompt, systemPrompt);
      }
      
      let responseText = '';
      
      // Handle OpenRouter response format (compatible with OpenAI format)
      if (response.choices && response.choices.length > 0) {
        responseText = response.choices[0].message.content;
        
        // Update context
        this.updateContext(prompt, responseText);
        
        logger.debug('Updated OpenRouter context', {
          contextLength: this.lastContext.length,
          modelUsed: response.model || MODEL
        });

        // Log additional OpenRouter-specific information if available
        if (response.usage) {
          logger.debug('OpenRouter usage stats', {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens
          });
        }
      } else if (response.error) {
        logger.error('OpenRouter API Error', response.error);
        return `Error from OpenRouter API: ${response.error.message}`;
      } else {
        logger.error('Unexpected response format from OpenRouter', response);
        return "Error: Unexpected response format from LLM provider";
      }
      
      logger.info('LLM response received from OpenRouter', {
        responseLength: responseText.length
      });
      
      return responseText;
    } catch (error) {
      // For network errors or other exceptions
      logger.error('OpenRouter LLM Error: ', error);
      
      // Type guard for error with message property
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if the error might be token-related
      if (typeof errorMessage === 'string' && (
          errorMessage.includes("maximum context length") || 
          errorMessage.includes("token") ||
          errorMessage.includes("too long")
        )) {
        logger.warn('Possible token limit error in exception, pruning context and retrying', {
          errorMessage,
          contextLength: this.lastContext.length
        });
        
        // Axe half the context and try again
        this.pruneContextIfNeeded();
        return this.processPrompt(prompt, systemPrompt);
      }
      
      return "Error communicating with OpenRouter API";
    }
  }
}

// Export a singleton instance
export const openRouterProcessor = new OpenRouterProcessor();

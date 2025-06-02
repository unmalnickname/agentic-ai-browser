import dotenv from 'dotenv';
import { BaseLLMProcessor, ConversationMessage } from "./BaseLLMProcessor.js";
import logger from '../../utils/logger.js';

dotenv.config();

// Configuration with environment variable fallbacks
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
const MODEL = process.env.LLM_MODEL || "deepseek-chat";
const API_KEY = process.env.OPENAI_API_KEY; // DeepSeek uses OpenAI-compatible API keys

class DeepSeekProcessor extends BaseLLMProcessor {
  // No need to override getSystemPrompt() - using base class implementation
  
  protected async processPrompt(prompt: string, systemPrompt: string): Promise<string> {
    // Check for API key
    if (!API_KEY) {
      logger.error('OPENAI_API_KEY is not defined in environment variables (required for DeepSeek)');
      return "Error: DeepSeek API key not configured";
    }

    try {
      // Build the payload for DeepSeek API (OpenAI-compatible format)
      const payload = {
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...this.lastContext,
          { role: "user", content: prompt }
        ]
      };
    
      const result = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify(payload)
      });

      logger.info('LLM request sent to DeepSeek', {
        model: MODEL,
        contextLength: this.lastContext.length,
        requestText: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
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
      
      // Handle DeepSeek response format (OpenAI-compatible)
      if (response.choices && response.choices.length > 0) {
        responseText = response.choices[0].message.content;
        
        // Update context
        this.updateContext(prompt, responseText);
        
        logger.debug('Updated DeepSeek context', {
          contextLength: this.lastContext.length
        });
      } else if (response.error) {
        logger.error('DeepSeek API Error', response.error);
        return `Error from DeepSeek API: ${response.error.message}`;
      } else {
        logger.error('Unexpected response format from DeepSeek', response);
        return "Error: Unexpected response format from LLM provider";
      }
      
      logger.info('LLM response received from DeepSeek', {
        responseLength: responseText.length
      });
      
      return responseText;
    } catch (error) {
      // For network errors or other exceptions
      logger.error('DeepSeek LLM Error: ', error);
      
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
      
      return "Error communicating with DeepSeek API";
    }
  }
}

// Export a singleton instance
export const deepSeekProcessor = new DeepSeekProcessor();

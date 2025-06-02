import dotenv from 'dotenv';
import { BaseLLMProcessor, ConversationMessage } from "./BaseLLMProcessor.js";
import logger from '../../utils/logger.js';

dotenv.config();

// Configuration with environment variable fallbacks
const CLAUDE_API_URL = process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.CLAUDE_MODEL || "claude-3-haiku-20240307";
const API_KEY = process.env.CLAUDE_API_KEY;
const MAX_TOKENS = parseInt(process.env.CLAUDE_MAX_TOKENS || "4096", 10);

class ClaudeProcessor extends BaseLLMProcessor {
  // No need to override getSystemPrompt() - using base class implementation
  
  protected async processPrompt(prompt: string, systemPrompt: string): Promise<string> {
    // Check for API key
    if (!API_KEY) {
      logger.error('CLAUDE_API_KEY is not defined in environment variables');
      return "Error: Claude API key not configured";
    }

    try {
      // Convert our internal message format to Claude's format
      const messages = this.formatMessagesForClaude(this.lastContext, prompt);
      
      // Build the payload for Claude API
      const payload = {
        model: MODEL,
        messages: messages,
        system: systemPrompt,
        max_tokens: MAX_TOKENS
      };
    
      const result = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(payload)
      });

      logger.info('LLM request sent to Claude', {
        model: MODEL,
        contextLength: this.lastContext.length,
        requestTextLength: prompt.length,
      });
      
      const response = await result.json();
      
      // Check for token limit errors
      if (!result.ok) {
        if (response.error && (
            response.error.type === 'context_too_long' || 
            response.error.message?.includes("token") ||
            response.error.message?.includes("too long") ||
            response.error.message?.includes("maximum context length")
          )) {
          logger.warn('Hit token limit, pruning context and retrying', {
            error: response.error.message,
            contextLength: this.lastContext.length
          });
          
          // Axe half the context and try again
          this.pruneContextIfNeeded();
          return this.processPrompt(prompt, systemPrompt);
        }
        
        // Handle other API errors
        logger.error('Claude API Error', response.error);
        return `Error from Claude API: ${response.error?.message || 'Unknown error'}`;
      }
      
      let responseText = '';
      
      // Handle Claude response format
      if (response.content && response.content.length > 0) {
        // Claude returns content as an array of blocks
        responseText = response.content
          .filter((block: any) => block.type === 'text')
          .map((block: any) => block.text)
          .join('\n');
        
        // Update context
        this.updateContext(prompt, responseText);
        
        logger.debug('Updated Claude context', {
          contextLength: this.lastContext.length
        });
      } else {
        logger.error('Unexpected response format from Claude', response);
        return "Error: Unexpected response format from LLM provider";
      }
      
      logger.info('LLM response received from Claude', {
        responseLength: responseText.length
      });
      
      return responseText;
    } catch (error) {
      // For network errors or other exceptions
      logger.error('Claude LLM Error: ', error);
      
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
      
      return "Error communicating with Claude API";
    }
  }

  /**
   * Formats messages from our internal format to Claude's expected format
   */
  private formatMessagesForClaude(
    contextMessages: ConversationMessage[], 
    currentPrompt: string
  ): Array<{role: string, content: string}> {
    // Convert our message format to Claude's format
    const formattedMessages = contextMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    // Add the current prompt as the last user message
    formattedMessages.push({
      role: 'user',
      content: currentPrompt
    });

    return formattedMessages;
  }
}

// Export a singleton instance
export const claudeProcessor = new ClaudeProcessor();

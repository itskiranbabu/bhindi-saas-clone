import { AIMessage } from './orchestrator';

export interface ConversationContext {
  conversationId: string;
  messages: AIMessage[];
  metadata: {
    userId: string;
    workspaceId: string;
    model: string;
    totalTokens: number;
    createdAt: Date;
    updatedAt: Date;
  };
  systemPrompt?: string;
}

export class ContextManager {
  private contexts: Map<string, ConversationContext> = new Map();
  private maxMessagesPerContext: number = 50;
  private maxTokensPerContext: number = 8000;

  /**
   * Get or create conversation context
   */
  getContext(conversationId: string): ConversationContext | undefined {
    return this.contexts.get(conversationId);
  }

  /**
   * Create new conversation context
   */
  createContext(
    conversationId: string,
    userId: string,
    workspaceId: string,
    systemPrompt?: string
  ): ConversationContext {
    const context: ConversationContext = {
      conversationId,
      messages: [],
      metadata: {
        userId,
        workspaceId,
        model: 'gpt-4-turbo',
        totalTokens: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      systemPrompt,
    };

    this.contexts.set(conversationId, context);
    return context;
  }

  /**
   * Add message to context
   */
  addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    tokensUsed: number = 0
  ): void {
    const context = this.contexts.get(conversationId);
    if (!context) {
      throw new Error(`Context not found: ${conversationId}`);
    }

    // Add message
    context.messages.push({ role, content });
    context.metadata.totalTokens += tokensUsed;
    context.metadata.updatedAt = new Date();

    // Trim context if needed
    this.trimContext(conversationId);
  }

  /**
   * Get messages for AI (with system prompt)
   */
  getMessagesForAI(conversationId: string): AIMessage[] {
    const context = this.contexts.get(conversationId);
    if (!context) {
      throw new Error(`Context not found: ${conversationId}`);
    }

    const messages: AIMessage[] = [];

    // Add system prompt if exists
    if (context.systemPrompt) {
      messages.push({
        role: 'system',
        content: context.systemPrompt,
      });
    }

    // Add conversation messages
    messages.push(...context.messages);

    return messages;
  }

  /**
   * Trim context to stay within limits
   */
  private trimContext(conversationId: string): void {
    const context = this.contexts.get(conversationId);
    if (!context) return;

    // Keep only recent messages
    if (context.messages.length > this.maxMessagesPerContext) {
      const systemMessages = context.messages.filter((m) => m.role === 'system');
      const otherMessages = context.messages.filter((m) => m.role !== 'system');
      
      // Keep system messages + recent conversation
      const recentMessages = otherMessages.slice(-this.maxMessagesPerContext);
      context.messages = [...systemMessages, ...recentMessages];
    }

    // Estimate tokens and trim if needed
    const estimatedTokens = this.estimateTokens(context.messages);
    if (estimatedTokens > this.maxTokensPerContext) {
      // Remove older messages (keep system messages)
      const systemMessages = context.messages.filter((m) => m.role === 'system');
      const otherMessages = context.messages.filter((m) => m.role !== 'system');
      
      // Keep reducing until under limit
      while (this.estimateTokens([...systemMessages, ...otherMessages]) > this.maxTokensPerContext && otherMessages.length > 2) {
        otherMessages.shift(); // Remove oldest message
      }
      
      context.messages = [...systemMessages, ...otherMessages];
    }
  }

  /**
   * Estimate tokens in messages
   */
  private estimateTokens(messages: AIMessage[]): number {
    return messages.reduce((total, msg) => {
      return total + Math.ceil(msg.content.length / 4);
    }, 0);
  }

  /**
   * Update system prompt
   */
  updateSystemPrompt(conversationId: string, systemPrompt: string): void {
    const context = this.contexts.get(conversationId);
    if (!context) {
      throw new Error(`Context not found: ${conversationId}`);
    }

    context.systemPrompt = systemPrompt;
    
    // Update system message in messages array
    const systemMessageIndex = context.messages.findIndex((m) => m.role === 'system');
    if (systemMessageIndex >= 0) {
      context.messages[systemMessageIndex].content = systemPrompt;
    } else {
      context.messages.unshift({ role: 'system', content: systemPrompt });
    }
  }

  /**
   * Clear context
   */
  clearContext(conversationId: string): void {
    this.contexts.delete(conversationId);
  }

  /**
   * Get context summary
   */
  getContextSummary(conversationId: string): {
    messageCount: number;
    totalTokens: number;
    model: string;
    lastUpdated: Date;
  } | null {
    const context = this.contexts.get(conversationId);
    if (!context) return null;

    return {
      messageCount: context.messages.length,
      totalTokens: context.metadata.totalTokens,
      model: context.metadata.model,
      lastUpdated: context.metadata.updatedAt,
    };
  }

  /**
   * Load context from database messages
   */
  loadFromMessages(
    conversationId: string,
    userId: string,
    workspaceId: string,
    messages: Array<{ role: string; content: string }>,
    systemPrompt?: string
  ): ConversationContext {
    const context = this.createContext(
      conversationId,
      userId,
      workspaceId,
      systemPrompt
    );

    // Add messages
    messages.forEach((msg) => {
      if (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system') {
        context.messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    });

    // Update metadata
    context.metadata.totalTokens = this.estimateTokens(context.messages);
    context.metadata.updatedAt = new Date();

    return context;
  }

  /**
   * Get all active contexts (for monitoring)
   */
  getActiveContexts(): Array<{
    conversationId: string;
    messageCount: number;
    totalTokens: number;
    userId: string;
  }> {
    return Array.from(this.contexts.entries()).map(([id, context]) => ({
      conversationId: id,
      messageCount: context.messages.length,
      totalTokens: context.metadata.totalTokens,
      userId: context.metadata.userId,
    }));
  }

  /**
   * Cleanup old contexts (call periodically)
   */
  cleanupOldContexts(maxAgeMinutes: number = 60): number {
    const now = new Date();
    let cleaned = 0;

    for (const [id, context] of this.contexts.entries()) {
      const ageMinutes =
        (now.getTime() - context.metadata.updatedAt.getTime()) / 1000 / 60;

      if (ageMinutes > maxAgeMinutes) {
        this.contexts.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Export singleton instance
export const contextManager = new ContextManager();

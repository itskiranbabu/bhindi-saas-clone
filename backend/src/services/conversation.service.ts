import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { aiOrchestrator } from '../ai/orchestrator';
import { contextManager } from '../ai/context';

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokensUsed: number;
  modelUsed: string;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  messages?: Message[];
}

export class ConversationService {
  /**
   * Create a new conversation
   */
  async createConversation(
    userId: string,
    workspaceId: string,
    title?: string
  ): Promise<Conversation> {
    const conversationId = uuidv4();

    const result = await db.query(
      `INSERT INTO conversations (id, workspace_id, user_id, title, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'active', NOW(), NOW())
       RETURNING id, workspace_id, user_id, title, status, created_at, updated_at`,
      [conversationId, workspaceId, userId, title || 'New Conversation']
    );

    const conversation = result.rows[0];

    // Initialize context
    contextManager.createContext(
      conversationId,
      userId,
      workspaceId,
      this.getSystemPrompt()
    );

    return this.formatConversation(conversation);
  }

  /**
   * Get conversation by ID
   */
  async getConversation(
    conversationId: string,
    userId: string
  ): Promise<Conversation> {
    // Get conversation
    const convResult = await db.query(
      `SELECT c.id, c.workspace_id, c.user_id, c.title, c.status, c.created_at, c.updated_at
       FROM conversations c
       WHERE c.id = $1 AND c.user_id = $2 AND c.archived_at IS NULL`,
      [conversationId, userId]
    );

    if (convResult.rows.length === 0) {
      throw new Error('Conversation not found');
    }

    const conversation = convResult.rows[0];

    // Get messages
    const messagesResult = await db.query(
      `SELECT id, conversation_id, role, content, tokens_used, model_used, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId]
    );

    conversation.messages = messagesResult.rows.map(this.formatMessage);

    // Load context if not already loaded
    if (!contextManager.getContext(conversationId)) {
      contextManager.loadFromMessages(
        conversationId,
        userId,
        conversation.workspace_id,
        conversation.messages,
        this.getSystemPrompt()
      );
    }

    return this.formatConversation(conversation);
  }

  /**
   * Get all conversations for a user
   */
  async getConversations(
    userId: string,
    workspaceId?: string,
    limit: number = 50
  ): Promise<Conversation[]> {
    let query = `
      SELECT c.id, c.workspace_id, c.user_id, c.title, c.status, c.created_at, c.updated_at,
             COUNT(m.id) as message_count
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
      WHERE c.user_id = $1 AND c.archived_at IS NULL
    `;

    const params: any[] = [userId];

    if (workspaceId) {
      query += ` AND c.workspace_id = $2`;
      params.push(workspaceId);
    }

    query += `
      GROUP BY c.id
      ORDER BY c.updated_at DESC
      LIMIT $${params.length + 1}
    `;
    params.push(limit);

    const result = await db.query(query, params);

    return result.rows.map(this.formatConversation);
  }

  /**
   * Send a message and get AI response
   */
  async sendMessage(
    conversationId: string,
    userId: string,
    content: string,
    model?: string
  ): Promise<{ userMessage: Message; aiMessage: Message }> {
    // Get conversation
    const convResult = await db.query(
      'SELECT workspace_id FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (convResult.rows.length === 0) {
      throw new Error('Conversation not found');
    }

    const workspaceId = convResult.rows[0].workspace_id;

    // Check usage quotas
    await this.checkUsageQuotas(workspaceId);

    // Save user message
    const userMessageId = uuidv4();
    const userTokens = aiOrchestrator.countTokens(content);

    await db.query(
      `INSERT INTO messages (id, conversation_id, role, content, tokens_used, model_used, created_at)
       VALUES ($1, $2, 'user', $3, $4, $5, NOW())`,
      [userMessageId, conversationId, content, userTokens, model || 'user-input']
    );

    const userMessage: Message = {
      id: userMessageId,
      conversationId,
      role: 'user',
      content,
      tokensUsed: userTokens,
      modelUsed: model || 'user-input',
      createdAt: new Date(),
    };

    // Add to context
    contextManager.addMessage(conversationId, 'user', content, userTokens);

    // Get AI response
    const messages = contextManager.getMessagesForAI(conversationId);
    const aiResponse = await aiOrchestrator.chat(messages, { model });

    // Save AI message
    const aiMessageId = uuidv4();
    await db.query(
      `INSERT INTO messages (id, conversation_id, role, content, tokens_used, model_used, created_at)
       VALUES ($1, $2, 'assistant', $3, $4, $5, NOW())`,
      [
        aiMessageId,
        conversationId,
        aiResponse.content,
        aiResponse.tokensUsed,
        aiResponse.model,
      ]
    );

    const aiMessage: Message = {
      id: aiMessageId,
      conversationId,
      role: 'assistant',
      content: aiResponse.content,
      tokensUsed: aiResponse.tokensUsed,
      modelUsed: aiResponse.model,
      createdAt: new Date(),
    };

    // Add to context
    contextManager.addMessage(
      conversationId,
      'assistant',
      aiResponse.content,
      aiResponse.tokensUsed
    );

    // Update conversation
    await db.query(
      'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
      [conversationId]
    );

    // Update usage quotas
    await this.updateUsageQuotas(
      workspaceId,
      userTokens + aiResponse.tokensUsed
    );

    // Auto-generate title if first message
    const messageCount = await this.getMessageCount(conversationId);
    if (messageCount === 2) {
      await this.generateTitle(conversationId, content);
    }

    return { userMessage, aiMessage };
  }

  /**
   * Stream AI response
   */
  async *streamMessage(
    conversationId: string,
    userId: string,
    content: string,
    model?: string
  ): AsyncGenerator<{ type: 'user' | 'ai' | 'done'; content: string; messageId?: string }> {
    // Get conversation
    const convResult = await db.query(
      'SELECT workspace_id FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (convResult.rows.length === 0) {
      throw new Error('Conversation not found');
    }

    const workspaceId = convResult.rows[0].workspace_id;

    // Check usage quotas
    await this.checkUsageQuotas(workspaceId);

    // Save user message
    const userMessageId = uuidv4();
    const userTokens = aiOrchestrator.countTokens(content);

    await db.query(
      `INSERT INTO messages (id, conversation_id, role, content, tokens_used, model_used, created_at)
       VALUES ($1, $2, 'user', $3, $4, $5, NOW())`,
      [userMessageId, conversationId, content, userTokens, model || 'user-input']
    );

    // Yield user message
    yield {
      type: 'user',
      content,
      messageId: userMessageId,
    };

    // Add to context
    contextManager.addMessage(conversationId, 'user', content, userTokens);

    // Stream AI response
    const messages = contextManager.getMessagesForAI(conversationId);
    let fullResponse = '';
    let totalTokens = 0;

    for await (const chunk of aiOrchestrator.streamChat(messages, { model })) {
      fullResponse += chunk.content;
      
      yield {
        type: 'ai',
        content: chunk.content,
      };

      if (chunk.done) {
        totalTokens = aiOrchestrator.countTokens(fullResponse);
        break;
      }
    }

    // Save AI message
    const aiMessageId = uuidv4();
    await db.query(
      `INSERT INTO messages (id, conversation_id, role, content, tokens_used, model_used, created_at)
       VALUES ($1, $2, 'assistant', $3, $4, $5, NOW())`,
      [
        aiMessageId,
        conversationId,
        fullResponse,
        totalTokens,
        model || 'gpt-4-turbo',
      ]
    );

    // Add to context
    contextManager.addMessage(
      conversationId,
      'assistant',
      fullResponse,
      totalTokens
    );

    // Update conversation
    await db.query(
      'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
      [conversationId]
    );

    // Update usage quotas
    await this.updateUsageQuotas(workspaceId, userTokens + totalTokens);

    // Auto-generate title if first message
    const messageCount = await this.getMessageCount(conversationId);
    if (messageCount === 2) {
      await this.generateTitle(conversationId, content);
    }

    yield {
      type: 'done',
      content: '',
      messageId: aiMessageId,
    };
  }

  /**
   * Update conversation title
   */
  async updateTitle(
    conversationId: string,
    userId: string,
    title: string
  ): Promise<void> {
    await db.query(
      `UPDATE conversations
       SET title = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3`,
      [title, conversationId, userId]
    );
  }

  /**
   * Archive conversation
   */
  async archiveConversation(
    conversationId: string,
    userId: string
  ): Promise<void> {
    await db.query(
      `UPDATE conversations
       SET archived_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [conversationId, userId]
    );

    // Clear context
    contextManager.clearContext(conversationId);
  }

  /**
   * Delete conversation
   */
  async deleteConversation(
    conversationId: string,
    userId: string
  ): Promise<void> {
    // Delete messages first
    await db.query('DELETE FROM messages WHERE conversation_id = $1', [
      conversationId,
    ]);

    // Delete conversation
    await db.query(
      'DELETE FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    // Clear context
    contextManager.clearContext(conversationId);
  }

  /**
   * Check usage quotas
   */
  private async checkUsageQuotas(workspaceId: string): Promise<void> {
    const result = await db.query(
      `SELECT resource_type, limit_value, current_usage
       FROM usage_quotas
       WHERE workspace_id = $1 AND resource_type IN ('messages', 'ai_tokens')`,
      [workspaceId]
    );

    for (const quota of result.rows) {
      if (quota.current_usage >= quota.limit_value) {
        throw new Error(
          `Usage quota exceeded for ${quota.resource_type}. Please upgrade your plan.`
        );
      }
    }
  }

  /**
   * Update usage quotas
   */
  private async updateUsageQuotas(
    workspaceId: string,
    tokensUsed: number
  ): Promise<void> {
    // Update messages quota
    await db.query(
      `UPDATE usage_quotas
       SET current_usage = current_usage + 1, updated_at = NOW()
       WHERE workspace_id = $1 AND resource_type = 'messages'`,
      [workspaceId]
    );

    // Update tokens quota
    await db.query(
      `UPDATE usage_quotas
       SET current_usage = current_usage + $1, updated_at = NOW()
       WHERE workspace_id = $2 AND resource_type = 'ai_tokens'`,
      [tokensUsed, workspaceId]
    );
  }

  /**
   * Get message count
   */
  private async getMessageCount(conversationId: string): Promise<number> {
    const result = await db.query(
      'SELECT COUNT(*) as count FROM messages WHERE conversation_id = $1',
      [conversationId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Auto-generate conversation title
   */
  private async generateTitle(
    conversationId: string,
    firstMessage: string
  ): Promise<void> {
    try {
      // Generate title from first message
      const titlePrompt = `Generate a short, concise title (max 6 words) for a conversation that starts with: "${firstMessage.substring(0, 100)}". Only return the title, nothing else.`;

      const response = await aiOrchestrator.chat(
        [{ role: 'user', content: titlePrompt }],
        { model: 'gpt-3.5-turbo', maxTokens: 20 }
      );

      const title = response.content.trim().replace(/^["']|["']$/g, '');

      await db.query(
        'UPDATE conversations SET title = $1 WHERE id = $2',
        [title, conversationId]
      );
    } catch (error) {
      console.error('Failed to generate title:', error);
      // Don't throw error, just log it
    }
  }

  /**
   * Get system prompt
   */
  private getSystemPrompt(): string {
    return `You are a helpful AI assistant in the Bhindi platform. You have access to various tools and agents to help users accomplish their tasks. Be concise, accurate, and helpful. When users ask you to perform actions, use the available tools and agents to complete the tasks.`;
  }

  /**
   * Format conversation object
   */
  private formatConversation(conv: any): Conversation {
    return {
      id: conv.id,
      workspaceId: conv.workspace_id,
      userId: conv.user_id,
      title: conv.title,
      status: conv.status,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
      messages: conv.messages,
    };
  }

  /**
   * Format message object
   */
  private formatMessage(msg: any): Message {
    return {
      id: msg.id,
      conversationId: msg.conversation_id,
      role: msg.role,
      content: msg.content,
      tokensUsed: msg.tokens_used,
      modelUsed: msg.model_used,
      createdAt: msg.created_at,
    };
  }
}

// Export singleton instance
export const conversationService = new ConversationService();

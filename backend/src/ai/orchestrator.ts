import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  tokensUsed: number;
  finishReason: string;
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

export class AIOrchestrator {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private google: GoogleGenerativeAI;
  private defaultModel: string;

  constructor() {
    // Initialize AI clients
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    this.google = new GoogleGenerativeAI(
      process.env.GOOGLE_AI_API_KEY || ''
    );

    this.defaultModel = process.env.DEFAULT_AI_MODEL || 'gpt-4-turbo';
  }

  /**
   * Send a chat message and get a response
   */
  async chat(
    messages: AIMessage[],
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    } = {}
  ): Promise<AIResponse> {
    const model = options.model || this.defaultModel;

    // Route to appropriate AI provider
    if (model.startsWith('gpt-')) {
      return this.chatOpenAI(messages, options);
    } else if (model.startsWith('claude-')) {
      return this.chatAnthropic(messages, options);
    } else if (model.startsWith('gemini-')) {
      return this.chatGoogle(messages, options);
    }

    throw new Error(`Unsupported model: ${model}`);
  }

  /**
   * Stream chat responses in real-time
   */
  async *streamChat(
    messages: AIMessage[],
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): AsyncGenerator<StreamChunk> {
    const model = options.model || this.defaultModel;

    if (model.startsWith('gpt-')) {
      yield* this.streamOpenAI(messages, options);
    } else if (model.startsWith('claude-')) {
      yield* this.streamAnthropic(messages, options);
    } else if (model.startsWith('gemini-')) {
      yield* this.streamGoogle(messages, options);
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }
  }

  /**
   * OpenAI Chat Implementation
   */
  private async chatOpenAI(
    messages: AIMessage[],
    options: any
  ): Promise<AIResponse> {
    try {
      const response = await this.openai.chat.completions.create({
        model: options.model || 'gpt-4-turbo',
        messages: messages as any,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
      });

      const choice = response.choices[0];

      return {
        content: choice.message.content || '',
        model: response.model,
        tokensUsed: response.usage?.total_tokens || 0,
        finishReason: choice.finish_reason,
      };
    } catch (error: any) {
      console.error('OpenAI Error:', error);
      throw new Error(`OpenAI API Error: ${error.message}`);
    }
  }

  /**
   * OpenAI Streaming Implementation
   */
  private async *streamOpenAI(
    messages: AIMessage[],
    options: any
  ): AsyncGenerator<StreamChunk> {
    try {
      const stream = await this.openai.chat.completions.create({
        model: options.model || 'gpt-4-turbo',
        messages: messages as any,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        const done = chunk.choices[0]?.finish_reason !== null;

        yield { content, done };
      }
    } catch (error: any) {
      console.error('OpenAI Streaming Error:', error);
      throw new Error(`OpenAI Streaming Error: ${error.message}`);
    }
  }

  /**
   * Anthropic Claude Implementation
   */
  private async chatAnthropic(
    messages: AIMessage[],
    options: any
  ): Promise<AIResponse> {
    try {
      // Convert messages format
      const systemMessage = messages.find((m) => m.role === 'system');
      const conversationMessages = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      const response = await this.anthropic.messages.create({
        model: options.model || 'claude-3-opus-20240229',
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        system: systemMessage?.content,
        messages: conversationMessages,
      });

      const content =
        response.content[0].type === 'text' ? response.content[0].text : '';

      return {
        content,
        model: response.model,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        finishReason: response.stop_reason || 'end_turn',
      };
    } catch (error: any) {
      console.error('Anthropic Error:', error);
      throw new Error(`Anthropic API Error: ${error.message}`);
    }
  }

  /**
   * Anthropic Streaming Implementation
   */
  private async *streamAnthropic(
    messages: AIMessage[],
    options: any
  ): AsyncGenerator<StreamChunk> {
    try {
      const systemMessage = messages.find((m) => m.role === 'system');
      const conversationMessages = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      const stream = await this.anthropic.messages.create({
        model: options.model || 'claude-3-opus-20240229',
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        system: systemMessage?.content,
        messages: conversationMessages,
        stream: true,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const content =
            event.delta.type === 'text_delta' ? event.delta.text : '';
          yield { content, done: false };
        } else if (event.type === 'message_stop') {
          yield { content: '', done: true };
        }
      }
    } catch (error: any) {
      console.error('Anthropic Streaming Error:', error);
      throw new Error(`Anthropic Streaming Error: ${error.message}`);
    }
  }

  /**
   * Google Gemini Implementation
   */
  private async chatGoogle(
    messages: AIMessage[],
    options: any
  ): Promise<AIResponse> {
    try {
      const model = this.google.getGenerativeModel({
        model: options.model || 'gemini-pro',
      });

      // Convert messages to Gemini format
      const history = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      const lastMessage = history.pop();
      const chat = model.startChat({
        history: history.slice(0, -1),
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 2000,
        },
      });

      const result = await chat.sendMessage(lastMessage?.parts[0].text || '');
      const response = await result.response;

      return {
        content: response.text(),
        model: 'gemini-pro',
        tokensUsed: 0, // Gemini doesn't provide token count in response
        finishReason: 'stop',
      };
    } catch (error: any) {
      console.error('Google AI Error:', error);
      throw new Error(`Google AI Error: ${error.message}`);
    }
  }

  /**
   * Google Gemini Streaming Implementation
   */
  private async *streamGoogle(
    messages: AIMessage[],
    options: any
  ): AsyncGenerator<StreamChunk> {
    try {
      const model = this.google.getGenerativeModel({
        model: options.model || 'gemini-pro',
      });

      const history = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      const lastMessage = history.pop();
      const chat = model.startChat({
        history: history.slice(0, -1),
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 2000,
        },
      });

      const result = await chat.sendMessageStream(
        lastMessage?.parts[0].text || ''
      );

      for await (const chunk of result.stream) {
        const content = chunk.text();
        yield { content, done: false };
      }

      yield { content: '', done: true };
    } catch (error: any) {
      console.error('Google AI Streaming Error:', error);
      throw new Error(`Google AI Streaming Error: ${error.message}`);
    }
  }

  /**
   * Count tokens in a message (approximate)
   */
  countTokens(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    const models: string[] = [];

    if (process.env.OPENAI_API_KEY) {
      models.push('gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo');
    }

    if (process.env.ANTHROPIC_API_KEY) {
      models.push(
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307'
      );
    }

    if (process.env.GOOGLE_AI_API_KEY) {
      models.push('gemini-pro', 'gemini-pro-vision');
    }

    return models;
  }
}

// Export singleton instance
export const aiOrchestrator = new AIOrchestrator();

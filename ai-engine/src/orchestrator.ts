import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from './utils/logger';

interface AIRequest {
  messages: Array<{ role: string; content: string }>;
  model: string;
  temperature: number;
  maxTokens: number;
  userId: string;
  conversationId?: string;
}

interface AIResponse {
  content: string;
  model: string;
  tokensUsed: number;
  finishReason: string;
}

export class AIOrchestrator {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private googleAI: GoogleGenerativeAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    this.googleAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
  }

  async process(request: AIRequest): Promise<AIResponse> {
    const { model, messages, temperature, maxTokens } = request;

    logger.info('Processing AI request', { model, messageCount: messages.length });

    try {
      if (model.startsWith('gpt-')) {
        return await this.processOpenAI(request);
      } else if (model.startsWith('claude-')) {
        return await this.processAnthropic(request);
      } else if (model.startsWith('gemini-')) {
        return await this.processGoogle(request);
      } else {
        throw new Error(`Unsupported model: ${model}`);
      }
    } catch (error: any) {
      logger.error('AI processing error:', error);
      throw error;
    }
  }

  private async processOpenAI(request: AIRequest): Promise<AIResponse> {
    const { model, messages, temperature, maxTokens } = request;

    const response = await this.openai.chat.completions.create({
      model,
      messages: messages as any,
      temperature,
      max_tokens: maxTokens,
    });

    const choice = response.choices[0];

    return {
      content: choice.message.content || '',
      model: response.model,
      tokensUsed: response.usage?.total_tokens || 0,
      finishReason: choice.finish_reason,
    };
  }

  private async processAnthropic(request: AIRequest): Promise<AIResponse> {
    const { model, messages, temperature, maxTokens } = request;

    // Convert messages format
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    const response = await this.anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemMessage?.content,
      messages: conversationMessages as any,
    });

    const content = response.content[0];

    return {
      content: content.type === 'text' ? content.text : '',
      model: response.model,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      finishReason: response.stop_reason || 'end_turn',
    };
  }

  private async processGoogle(request: AIRequest): Promise<AIResponse> {
    const { model, messages, temperature, maxTokens } = request;

    const genModel = this.googleAI.getGenerativeModel({ model });

    // Convert messages to Google format
    const prompt = messages.map((m) => `${m.role}: ${m.content}`).join('\n\n');

    const result = await genModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    });

    const response = result.response;

    return {
      content: response.text(),
      model,
      tokensUsed: 0, // Google doesn't provide token count in the same way
      finishReason: 'stop',
    };
  }

  async stream(
    request: AIRequest,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const { model, messages, temperature, maxTokens } = request;

    if (model.startsWith('gpt-')) {
      const stream = await this.openai.chat.completions.create({
        model,
        messages: messages as any,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          onChunk(content);
        }
      }
    } else if (model.startsWith('claude-')) {
      const systemMessage = messages.find((m) => m.role === 'system');
      const conversationMessages = messages.filter((m) => m.role !== 'system');

      const stream = await this.anthropic.messages.stream({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemMessage?.content,
        messages: conversationMessages as any,
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          onChunk(chunk.delta.text);
        }
      }
    } else {
      throw new Error(`Streaming not supported for model: ${model}`);
    }
  }

  async executeTool(toolName: string, parameters: any, userId: string): Promise<any> {
    logger.info('Executing tool', { toolName, userId });

    // TODO: Implement tool execution logic
    // This would integrate with various APIs and services

    return {
      success: true,
      result: 'Tool execution placeholder',
    };
  }
}

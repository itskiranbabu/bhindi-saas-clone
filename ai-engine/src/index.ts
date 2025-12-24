import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AIOrchestrator } from './orchestrator';
import { logger } from './utils/logger';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 8001;

app.use(cors());
app.use(express.json());

const orchestrator = new AIOrchestrator();

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Process AI request
app.post('/ai/process', async (req: Request, res: Response) => {
  try {
    const { messages, model, temperature, maxTokens, userId, conversationId } = req.body;

    logger.info('Processing AI request', { userId, conversationId, model });

    const response = await orchestrator.process({
      messages,
      model: model || process.env.DEFAULT_AI_MODEL || 'gpt-4-turbo',
      temperature: temperature || 0.7,
      maxTokens: maxTokens || 4096,
      userId,
      conversationId,
    });

    res.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    logger.error('AI processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'AI processing failed',
    });
  }
});

// Stream AI response
app.post('/ai/stream', async (req: Request, res: Response) => {
  try {
    const { messages, model, temperature, maxTokens, userId, conversationId } = req.body;

    logger.info('Streaming AI request', { userId, conversationId, model });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await orchestrator.stream(
      {
        messages,
        model: model || process.env.DEFAULT_AI_MODEL || 'gpt-4-turbo',
        temperature: temperature || 0.7,
        maxTokens: maxTokens || 4096,
        userId,
        conversationId,
      },
      (chunk: string) => {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
    );

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    logger.error('AI streaming error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'AI streaming failed',
    });
  }
});

// Execute tool
app.post('/tools/execute', async (req: Request, res: Response) => {
  try {
    const { toolName, parameters, userId } = req.body;

    logger.info('Executing tool', { toolName, userId });

    const result = await orchestrator.executeTool(toolName, parameters, userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Tool execution error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Tool execution failed',
    });
  }
});

app.listen(PORT, () => {
  logger.info(`🤖 AI Engine running on port ${PORT}`);
});

export { app };

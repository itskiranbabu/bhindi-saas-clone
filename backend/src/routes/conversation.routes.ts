import { Router, Request, Response } from 'express';
import { conversationService } from '../services/conversation.service';
import { authService } from '../services/auth.service';

const router = Router();

// Middleware to verify authentication
const authenticate = async (req: any, res: Response, next: any) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const user = await authService.verifyToken(token);
    req.user = user;
    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: error.message || 'Invalid token',
    });
  }
};

/**
 * Get all conversations
 * GET /api/conversations
 */
router.get('/', authenticate, async (req: any, res: Response) => {
  try {
    const { workspaceId, limit } = req.query;

    const conversations = await conversationService.getConversations(
      req.user.id,
      workspaceId as string,
      limit ? parseInt(limit as string) : 50
    );

    res.json({
      success: true,
      data: conversations,
    });
  } catch (error: any) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get conversations',
    });
  }
});

/**
 * Get conversation by ID
 * GET /api/conversations/:id
 */
router.get('/:id', authenticate, async (req: any, res: Response) => {
  try {
    const conversation = await conversationService.getConversation(
      req.params.id,
      req.user.id
    );

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error: any) {
    console.error('Get conversation error:', error);
    res.status(404).json({
      success: false,
      message: error.message || 'Conversation not found',
    });
  }
});

/**
 * Create new conversation
 * POST /api/conversations
 */
router.post('/', authenticate, async (req: any, res: Response) => {
  try {
    const { workspaceId, title } = req.body;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: 'Workspace ID is required',
      });
    }

    const conversation = await conversationService.createConversation(
      req.user.id,
      workspaceId,
      title
    );

    res.status(201).json({
      success: true,
      message: 'Conversation created successfully',
      data: conversation,
    });
  } catch (error: any) {
    console.error('Create conversation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create conversation',
    });
  }
});

/**
 * Send message to conversation
 * POST /api/conversations/:id/messages
 */
router.post('/:id/messages', authenticate, async (req: any, res: Response) => {
  try {
    const { content, model } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required',
      });
    }

    const result = await conversationService.sendMessage(
      req.params.id,
      req.user.id,
      content,
      model
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Send message error:', error);
    
    // Handle quota exceeded errors
    if (error.message.includes('quota exceeded')) {
      return res.status(429).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send message',
    });
  }
});

/**
 * Stream message response (SSE)
 * POST /api/conversations/:id/messages/stream
 */
router.post('/:id/messages/stream', authenticate, async (req: any, res: Response) => {
  try {
    const { content, model } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required',
      });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream the response
    const stream = conversationService.streamMessage(
      req.params.id,
      req.user.id,
      content,
      model
    );

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.end();
  } catch (error: any) {
    console.error('Stream message error:', error);
    
    // Send error as SSE event
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: error.message || 'Failed to stream message',
    })}\n\n`);
    res.end();
  }
});

/**
 * Update conversation title
 * PATCH /api/conversations/:id
 */
router.patch('/:id', authenticate, async (req: any, res: Response) => {
  try {
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required',
      });
    }

    await conversationService.updateTitle(
      req.params.id,
      req.user.id,
      title
    );

    res.json({
      success: true,
      message: 'Conversation updated successfully',
    });
  } catch (error: any) {
    console.error('Update conversation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update conversation',
    });
  }
});

/**
 * Archive conversation
 * DELETE /api/conversations/:id
 */
router.delete('/:id', authenticate, async (req: any, res: Response) => {
  try {
    await conversationService.archiveConversation(
      req.params.id,
      req.user.id
    );

    res.json({
      success: true,
      message: 'Conversation archived successfully',
    });
  } catch (error: any) {
    console.error('Archive conversation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to archive conversation',
    });
  }
});

/**
 * Permanently delete conversation
 * DELETE /api/conversations/:id/permanent
 */
router.delete('/:id/permanent', authenticate, async (req: any, res: Response) => {
  try {
    await conversationService.deleteConversation(
      req.params.id,
      req.user.id
    );

    res.json({
      success: true,
      message: 'Conversation deleted permanently',
    });
  } catch (error: any) {
    console.error('Delete conversation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete conversation',
    });
  }
});

export default router;

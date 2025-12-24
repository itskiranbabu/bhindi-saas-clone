import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query, transaction } from '../database/connection';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError, asyncHandler } from '../middleware/error.middleware';
import { aiRateLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Get all conversations
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { workspaceId } = req.query;

    let queryText = `
      SELECT c.id, c.title, c.status, c.created_at, c.updated_at,
             COUNT(m.id) as message_count
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
      WHERE c.user_id = $1 AND c.archived_at IS NULL
    `;
    const params: any[] = [req.user!.id];

    if (workspaceId) {
      queryText += ` AND c.workspace_id = $2`;
      params.push(workspaceId);
    }

    queryText += `
      GROUP BY c.id
      ORDER BY c.updated_at DESC
      LIMIT 50
    `;

    const result = await query(queryText, params);

    res.json({
      success: true,
      data: { conversations: result.rows },
    });
  })
);

// Get conversation by ID
router.get(
  '/:conversationId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { conversationId } = req.params;

    const convResult = await query(
      `SELECT c.id, c.title, c.context, c.metadata, c.status, c.created_at, c.updated_at
       FROM conversations c
       WHERE c.id = $1 AND c.user_id = $2 AND c.archived_at IS NULL`,
      [conversationId, req.user!.id]
    );

    if (convResult.rows.length === 0) {
      throw new AppError('Conversation not found', 404);
    }

    const conversation = convResult.rows[0];

    // Get messages
    const messagesResult = await query(
      `SELECT id, role, content, tokens_used, model_used, metadata, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId]
    );

    res.json({
      success: true,
      data: {
        conversation,
        messages: messagesResult.rows,
      },
    });
  })
);

// Create new conversation
router.post(
  '/',
  [body('title').optional().trim(), body('workspaceId').isUUID()],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { title, workspaceId } = req.body;

    const result = await query(
      `INSERT INTO conversations (workspace_id, user_id, title, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING id, title, status, created_at`,
      [workspaceId, req.user!.id, title || 'New Conversation']
    );

    res.status(201).json({
      success: true,
      data: { conversation: result.rows[0] },
    });
  })
);

// Send message
router.post(
  '/:conversationId/messages',
  aiRateLimiter,
  [body('content').trim().notEmpty()],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { conversationId } = req.params;
    const { content } = req.body;

    // Verify conversation ownership
    const convCheck = await query(
      'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationId, req.user!.id]
    );

    if (convCheck.rows.length === 0) {
      throw new AppError('Conversation not found', 404);
    }

    await transaction(async (client) => {
      // Save user message
      await client.query(
        `INSERT INTO messages (conversation_id, role, content)
         VALUES ($1, 'user', $2)`,
        [conversationId, content]
      );

      // Update conversation timestamp
      await client.query(
        'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
        [conversationId]
      );
    });

    // TODO: Call AI engine to generate response
    // For now, return success
    res.json({
      success: true,
      message: 'Message sent successfully',
    });
  })
);

// Update conversation
router.patch(
  '/:conversationId',
  [body('title').optional().trim()],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { conversationId } = req.params;
    const { title } = req.body;

    const result = await query(
      `UPDATE conversations
       SET title = COALESCE($1, title), updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING id, title, updated_at`,
      [title, conversationId, req.user!.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Conversation not found', 404);
    }

    res.json({
      success: true,
      data: { conversation: result.rows[0] },
    });
  })
);

// Archive conversation
router.delete(
  '/:conversationId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { conversationId } = req.params;

    const result = await query(
      `UPDATE conversations
       SET archived_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [conversationId, req.user!.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Conversation not found', 404);
    }

    res.json({
      success: true,
      message: 'Conversation archived',
    });
  })
);

export default router;

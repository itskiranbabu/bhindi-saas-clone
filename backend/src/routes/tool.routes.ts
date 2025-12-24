import { Router, Response } from 'express';
import { query } from '../database/connection';
import { AuthRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// Get all tools
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { category } = req.query;

    let queryText = `
      SELECT id, name, category, description, is_active
      FROM tools
      WHERE is_active = true
    `;

    const params: any[] = [];

    if (category) {
      queryText += ` AND category = $1`;
      params.push(category);
    }

    queryText += ` ORDER BY category, name`;

    const result = await query(queryText, params);

    res.json({
      success: true,
      data: { tools: result.rows },
    });
  })
);

// Get tool executions
router.get(
  '/executions',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { limit = 50 } = req.query;

    const result = await query(
      `SELECT te.id, te.status, te.execution_time_ms, te.created_at, te.completed_at,
              t.name as tool_name, t.category as tool_category
       FROM tool_executions te
       JOIN tools t ON te.tool_id = t.id
       WHERE te.user_id = $1
       ORDER BY te.created_at DESC
       LIMIT $2`,
      [req.user!.id, limit]
    );

    res.json({
      success: true,
      data: { executions: result.rows },
    });
  })
);

export default router;

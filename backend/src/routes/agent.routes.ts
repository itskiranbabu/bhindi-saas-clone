import { Router, Response } from 'express';
import { query } from '../database/connection';
import { AuthRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// Get all agents
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { workspaceId } = req.query;

    let queryText = `
      SELECT id, name, description, type, config, is_active, created_at
      FROM agents
      WHERE (is_system = true OR workspace_id = $1)
      AND is_active = true
      ORDER BY is_system DESC, name ASC
    `;

    const result = await query(queryText, [workspaceId || req.user!.workspaceId]);

    res.json({
      success: true,
      data: { agents: result.rows },
    });
  })
);

// Get agent executions
router.get(
  '/executions',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { limit = 50 } = req.query;

    const result = await query(
      `SELECT ae.id, ae.status, ae.execution_time_ms, ae.created_at, ae.completed_at,
              a.name as agent_name, a.type as agent_type
       FROM agent_executions ae
       JOIN agents a ON ae.agent_id = a.id
       WHERE ae.user_id = $1
       ORDER BY ae.created_at DESC
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

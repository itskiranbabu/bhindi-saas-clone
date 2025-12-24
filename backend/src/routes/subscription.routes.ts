import { Router, Response } from 'express';
import { query } from '../database/connection';
import { AuthRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// Get subscription details
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { workspaceId } = req.query;

    const result = await query(
      `SELECT s.id, s.plan_name, s.status, s.current_period_start, 
              s.current_period_end, s.cancel_at_period_end,
              w.plan_type
       FROM subscriptions s
       JOIN workspaces w ON s.workspace_id = w.id
       WHERE s.workspace_id = $1
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [workspaceId || req.user!.workspaceId]
    );

    res.json({
      success: true,
      data: { subscription: result.rows[0] || null },
    });
  })
);

// Get usage quotas
router.get(
  '/usage',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { workspaceId } = req.query;

    const result = await query(
      `SELECT resource_type, limit_value, current_usage, reset_period, last_reset_at
       FROM usage_quotas
       WHERE workspace_id = $1
       ORDER BY resource_type`,
      [workspaceId || req.user!.workspaceId]
    );

    res.json({
      success: true,
      data: { quotas: result.rows },
    });
  })
);

export default router;

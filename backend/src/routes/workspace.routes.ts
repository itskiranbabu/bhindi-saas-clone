import { Router, Response } from 'express';
import { query } from '../database/connection';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError, asyncHandler } from '../middleware/error.middleware';

const router = Router();

// Get user's workspaces
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await query(
      `SELECT w.id, w.name, w.slug, w.plan_type, w.created_at,
              wm.role
       FROM workspaces w
       JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE wm.user_id = $1
       ORDER BY w.created_at DESC`,
      [req.user!.id]
    );

    res.json({
      success: true,
      data: { workspaces: result.rows },
    });
  })
);

// Get workspace details
router.get(
  '/:workspaceId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { workspaceId } = req.params;

    const result = await query(
      `SELECT w.id, w.name, w.slug, w.plan_type, w.settings, w.created_at,
              wm.role
       FROM workspaces w
       JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE w.id = $1 AND wm.user_id = $2`,
      [workspaceId, req.user!.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Workspace not found', 404);
    }

    res.json({
      success: true,
      data: { workspace: result.rows[0] },
    });
  })
);

// Get workspace members
router.get(
  '/:workspaceId/members',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { workspaceId } = req.params;

    // Verify user has access
    const accessCheck = await query(
      'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, req.user!.id]
    );

    if (accessCheck.rows.length === 0) {
      throw new AppError('Access denied', 403);
    }

    const result = await query(
      `SELECT u.id, u.email, u.full_name, u.avatar_url,
              wm.role, wm.joined_at
       FROM workspace_members wm
       JOIN users u ON wm.user_id = u.id
       WHERE wm.workspace_id = $1
       ORDER BY wm.joined_at ASC`,
      [workspaceId]
    );

    res.json({
      success: true,
      data: { members: result.rows },
    });
  })
);

export default router;

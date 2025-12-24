import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../database/connection';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError, asyncHandler } from '../middleware/error.middleware';

const router = Router();

// Get all workflows
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { workspaceId } = req.query;

    const result = await query(
      `SELECT id, name, description, is_active, created_at, updated_at
       FROM workflows
       WHERE workspace_id = $1
       ORDER BY created_at DESC`,
      [workspaceId || req.user!.workspaceId]
    );

    res.json({
      success: true,
      data: { workflows: result.rows },
    });
  })
);

// Get workflow by ID
router.get(
  '/:workflowId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { workflowId } = req.params;

    const result = await query(
      `SELECT id, name, description, trigger_config, steps, is_active, created_at
       FROM workflows
       WHERE id = $1 AND workspace_id = $2`,
      [workflowId, req.user!.workspaceId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Workflow not found', 404);
    }

    res.json({
      success: true,
      data: { workflow: result.rows[0] },
    });
  })
);

// Create workflow
router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('triggerConfig').isObject(),
    body('steps').isArray(),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { name, description, triggerConfig, steps, workspaceId } = req.body;

    const result = await query(
      `INSERT INTO workflows (workspace_id, name, description, trigger_config, steps, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, description, is_active, created_at`,
      [
        workspaceId || req.user!.workspaceId,
        name,
        description,
        JSON.stringify(triggerConfig),
        JSON.stringify(steps),
        req.user!.id,
      ]
    );

    res.status(201).json({
      success: true,
      data: { workflow: result.rows[0] },
    });
  })
);

// Get workflow executions
router.get(
  '/:workflowId/executions',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { workflowId } = req.params;
    const { limit = 50 } = req.query;

    const result = await query(
      `SELECT id, status, started_at, completed_at
       FROM workflow_executions
       WHERE workflow_id = $1
       ORDER BY started_at DESC
       LIMIT $2`,
      [workflowId, limit]
    );

    res.json({
      success: true,
      data: { executions: result.rows },
    });
  })
);

export default router;

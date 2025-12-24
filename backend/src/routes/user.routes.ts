import { Router, Response } from 'express';
import { query } from '../database/connection';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError, asyncHandler } from '../middleware/error.middleware';

const router = Router();

// Get current user profile
router.get(
  '/me',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await query(
      `SELECT id, email, full_name, avatar_url, timezone, locale, created_at
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: { user: result.rows[0] },
    });
  })
);

// Update user profile
router.patch(
  '/me',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { fullName, timezone, locale } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (fullName !== undefined) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(fullName);
    }
    if (timezone !== undefined) {
      updates.push(`timezone = $${paramCount++}`);
      values.push(timezone);
    }
    if (locale !== undefined) {
      updates.push(`locale = $${paramCount++}`);
      values.push(locale);
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    values.push(req.user!.id);

    const result = await query(
      `UPDATE users
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING id, email, full_name, timezone, locale`,
      values
    );

    res.json({
      success: true,
      data: { user: result.rows[0] },
    });
  })
);

export default router;

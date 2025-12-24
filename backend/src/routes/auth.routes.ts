import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../database/connection';
import { AppError, asyncHandler } from '../middleware/error.middleware';
import { authRateLimiter } from '../middleware/rateLimit.middleware';
import { logger } from '../utils/logger';

const router = Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('fullName').trim().notEmpty(),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

// Register
router.post(
  '/register',
  authRateLimiter,
  registerValidation,
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { email, password, fullName } = req.body;

    // Check if user exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new AppError('Email already registered', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING id, email, full_name, created_at`,
      [email, passwordHash, fullName]
    );

    const user = result.rows[0];

    // Create default workspace
    const workspaceResult = await query(
      `INSERT INTO workspaces (name, slug, owner_id, plan_type)
       VALUES ($1, $2, $3, 'free')
       RETURNING id`,
      [`${fullName}'s Workspace`, `${user.id}-workspace`, user.id]
    );

    const workspaceId = workspaceResult.rows[0].id;

    // Add user to workspace
    await query(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [workspaceId, user.id]
    );

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        workspaceId,
        role: 'owner',
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info('User registered', { userId: user.id, email: user.email });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          workspaceId,
        },
        token,
      },
    });
  })
);

// Login
router.post(
  '/login',
  authRateLimiter,
  loginValidation,
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { email, password } = req.body;

    // Get user
    const result = await query(
      `SELECT u.id, u.email, u.password_hash, u.full_name, u.status,
              wm.workspace_id, wm.role
       FROM users u
       LEFT JOIN workspace_members wm ON u.id = wm.user_id
       WHERE u.email = $1 AND u.deleted_at IS NULL
       LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      throw new AppError('Invalid credentials', 401);
    }

    const user = result.rows[0];

    if (user.status !== 'active') {
      throw new AppError('Account is not active', 403);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Update last login
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        workspaceId: user.workspace_id,
        role: user.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info('User logged in', { userId: user.id, email: user.email });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          workspaceId: user.workspace_id,
          role: user.role,
        },
        token,
      },
    });
  })
);

// Verify token
router.get(
  '/verify',
  asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      // Get fresh user data
      const result = await query(
        `SELECT u.id, u.email, u.full_name, u.status,
                wm.workspace_id, wm.role
         FROM users u
         LEFT JOIN workspace_members wm ON u.id = wm.user_id
         WHERE u.id = $1 AND u.deleted_at IS NULL`,
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        throw new AppError('User not found', 404);
      }

      const user = result.rows[0];

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            workspaceId: user.workspace_id,
            role: user.role,
          },
        },
      });
    } catch (error) {
      throw new AppError('Invalid token', 401);
    }
  })
);

// Logout (client-side token removal, but we can log it)
router.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('User logged out');
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  })
);

export default router;

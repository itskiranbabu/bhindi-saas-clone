import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  status: string;
  createdAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private jwtSecret: string;
  private jwtExpiresIn: string;
  private refreshTokenExpiresIn: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-this';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    this.refreshTokenExpiresIn = '30d';
  }

  /**
   * Register a new user
   */
  async register(
    email: string,
    password: string,
    fullName: string
  ): Promise<{ user: User; tokens: AuthTokens }> {
    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = uuidv4();
    const result = await db.query(
      `INSERT INTO users (id, email, password_hash, full_name, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'active', NOW(), NOW())
       RETURNING id, email, full_name, avatar_url, status, created_at`,
      [userId, email, passwordHash, fullName]
    );

    const user = result.rows[0];

    // Create default workspace for user
    await this.createDefaultWorkspace(userId, fullName);

    // Generate tokens
    const tokens = this.generateTokens(userId, email);

    return {
      user: this.formatUser(user),
      tokens,
    };
  }

  /**
   * Login user
   */
  async login(
    email: string,
    password: string
  ): Promise<{ user: User; tokens: AuthTokens }> {
    // Find user
    const result = await db.query(
      `SELECT id, email, password_hash, full_name, avatar_url, status, created_at
       FROM users
       WHERE email = $1 AND deleted_at IS NULL`,
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0];

    // Check if user is active
    if (user.status !== 'active') {
      throw new Error('Account is not active');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await db.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate tokens
    const tokens = this.generateTokens(user.id, user.email);

    return {
      user: this.formatUser(user),
      tokens,
    };
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<User> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as {
        userId: string;
        email: string;
      };

      // Get user from database
      const result = await db.query(
        `SELECT id, email, full_name, avatar_url, status, created_at
         FROM users
         WHERE id = $1 AND deleted_at IS NULL`,
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];

      if (user.status !== 'active') {
        throw new Error('Account is not active');
      }

      return this.formatUser(user);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtSecret) as {
        userId: string;
        email: string;
        type: string;
      };

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Verify user still exists and is active
      const result = await db.query(
        'SELECT id, email, status FROM users WHERE id = $1 AND deleted_at IS NULL',
        [decoded.userId]
      );

      if (result.rows.length === 0 || result.rows[0].status !== 'active') {
        throw new Error('User not found or inactive');
      }

      // Generate new tokens
      return this.generateTokens(decoded.userId, decoded.email);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Get current password hash
    const result = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(
      currentPassword,
      result.rows[0].password_hash
    );

    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, userId]
    );
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<string> {
    // Find user
    const result = await db.query(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists
      return 'If the email exists, a reset link will be sent';
    }

    const userId = result.rows[0].id;

    // Generate reset token (expires in 1 hour)
    const resetToken = jwt.sign(
      { userId, type: 'password-reset' },
      this.jwtSecret,
      { expiresIn: '1h' }
    );

    // TODO: Send email with reset link
    // For now, just return the token
    return resetToken;
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as {
        userId: string;
        type: string;
      };

      if (decoded.type !== 'password-reset') {
        throw new Error('Invalid token type');
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Update password
      await db.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [passwordHash, decoded.userId]
      );
    } catch (error) {
      throw new Error('Invalid or expired reset token');
    }
  }

  /**
   * Generate JWT tokens
   */
  private generateTokens(userId: string, email: string): AuthTokens {
    const accessToken = jwt.sign(
      { userId, email, type: 'access' },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn }
    );

    const refreshToken = jwt.sign(
      { userId, email, type: 'refresh' },
      this.jwtSecret,
      { expiresIn: this.refreshTokenExpiresIn }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Create default workspace for new user
   */
  private async createDefaultWorkspace(
    userId: string,
    userName: string
  ): Promise<void> {
    const workspaceId = uuidv4();
    const slug = `${userName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

    // Create workspace
    await db.query(
      `INSERT INTO workspaces (id, name, slug, owner_id, plan_type, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'free', NOW(), NOW())`,
      [workspaceId, `${userName}'s Workspace`, slug, userId]
    );

    // Add user as workspace member
    await db.query(
      `INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
       VALUES ($1, $2, $3, 'owner', NOW())`,
      [uuidv4(), workspaceId, userId]
    );

    // Create default usage quotas
    const quotas = [
      { type: 'conversations', limit: 100 },
      { type: 'messages', limit: 1000 },
      { type: 'ai_tokens', limit: 100000 },
      { type: 'agent_executions', limit: 500 },
      { type: 'tool_executions', limit: 1000 },
    ];

    for (const quota of quotas) {
      await db.query(
        `INSERT INTO usage_quotas (id, workspace_id, resource_type, limit_value, current_usage, reset_period, last_reset_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 0, 'monthly', NOW(), NOW(), NOW())`,
        [uuidv4(), workspaceId, quota.type, quota.limit]
      );
    }
  }

  /**
   * Format user object (remove sensitive data)
   */
  private formatUser(user: any): User {
    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      status: user.status,
      createdAt: user.created_at,
    };
  }
}

// Export singleton instance
export const authService = new AuthService();

import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';

let pool: Pool | null = null;

export async function connectDatabase(): Promise<Pool> {
  if (pool) {
    return pool;
  }

  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
      min: parseInt(process.env.DATABASE_POOL_MIN || '2'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Test connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    logger.info('Database connection established');
    return pool;
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call connectDatabase() first.');
  }
  return pool;
}

export async function query(text: string, params?: any[]): Promise<any> {
  const start = Date.now();
  try {
    const result = await getPool().query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Query error:', { text, error });
    throw error;
  }
}

export async function getClient(): Promise<PoolClient> {
  return await getPool().connect();
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database connection closed');
  }
}

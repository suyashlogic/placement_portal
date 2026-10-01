import pg from 'pg';
import env from './env.js';

const pool = new pg.Pool(env.db);

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

// Simple parameterized query: query('SELECT * FROM x WHERE id = $1', [id])
export const query = (text, params) => pool.query(text, params);

// For transactions (Phase 6): one client, BEGIN ... COMMIT / ROLLBACK
export const getClient = () => pool.connect();

export default pool;
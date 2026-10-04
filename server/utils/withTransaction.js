import { getClient } from '../config/db.js';

// Runs work(client) inside BEGIN ... COMMIT. Any error triggers ROLLBACK, so
// multi-step changes either all happen or none happen (atomicity).
export const withTransaction = async (work) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

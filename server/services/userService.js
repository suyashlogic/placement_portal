import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { withTransaction } from '../utils/withTransaction.js';
import { setActor } from '../utils/txHelpers.js';

const PUBLIC_COLS = `user_id AS "userId", email, full_name AS "fullName", role, is_active AS "isActive"`;

export const listUsers = async () => {
  const result = await query(
    `SELECT u.user_id AS "userId", u.email, u.full_name AS "fullName", u.role,
            u.is_active AS "isActive", u.created_at AS "createdAt", s.roll_number AS "rollNumber"
       FROM users u LEFT JOIN students s ON s.user_id = u.user_id
      ORDER BY u.role, u.full_name`
  );
  return result.rows;
};

// Each write runs in a transaction that first declares the acting admin, so the database audit trigger
// (audit_row_change) records WHO created, deactivated or reset a password, not just what changed.
export const createOfficer = async ({ fullName, email, password }, actorId) => {
  const hash = await bcrypt.hash(password, 10);
  return withTransaction(async (client) => {
    await setActor(client, actorId);
    const result = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, 'PLACEMENT_OFFICER') RETURNING ${PUBLIC_COLS}`,
      [email, hash, fullName]
    );
    return result.rows[0];
  });
};

export const setUserActive = (userId, isActive, actorId) =>
  withTransaction(async (client) => {
    await setActor(client, actorId);
    const result = await client.query(
      `UPDATE users SET is_active = $1 WHERE user_id = $2 RETURNING ${PUBLIC_COLS}`,
      [isActive, userId]
    );
    return result.rows[0] || null;
  });

export const resetUserPassword = async (userId, password, actorId) => {
  const hash = await bcrypt.hash(password, 10);
  return withTransaction(async (client) => {
    await setActor(client, actorId);
    const result = await client.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [hash, userId]);
    return result.rowCount > 0;
  });
};

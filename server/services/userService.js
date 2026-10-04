import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';

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

export const createOfficer = async ({ fullName, email, password }) => {
  const hash = await bcrypt.hash(password, 10);
  const result = await query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, 'PLACEMENT_OFFICER') RETURNING ${PUBLIC_COLS}`,
    [email, hash, fullName]
  );
  return result.rows[0];
};

export const setUserActive = async (userId, isActive) => {
  const result = await query(
    `UPDATE users SET is_active = $1 WHERE user_id = $2 RETURNING ${PUBLIC_COLS}`,
    [isActive, userId]
  );
  return result.rows[0] || null;
};

export const resetUserPassword = async (userId, password) => {
  const hash = await bcrypt.hash(password, 10);
  const result = await query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [hash, userId]);
  return result.rowCount > 0;
};

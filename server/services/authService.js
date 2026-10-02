import bcrypt from 'bcryptjs';
import { query, getClient } from '../config/db.js';

// Used by the login strategy. Includes password_hash, so never send this to the client.
export const findUserByEmail = async (email) => {
  const result = await query(
    'SELECT user_id, email, password_hash, full_name, role, is_active FROM users WHERE LOWER(email) = LOWER($1)',
    [email]
  );
  return result.rows[0] || null;
};

// Used on every request by deserializeUser. No password_hash here.
export const findUserById = async (userId) => {
  const result = await query(
    `SELECT u.user_id, u.email, u.full_name, u.role, u.is_active, s.student_id
       FROM users u
       LEFT JOIN students s ON s.user_id = u.user_id
      WHERE u.user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
};

export const registerStudent = async ({
  fullName, email, password, departmentId, rollNumber, graduationYear, phone,
}) => {
  const passwordHash = await bcrypt.hash(password, 10);

  const client = await getClient(); // one dedicated connection for the whole transaction
  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, 'STUDENT') RETURNING user_id`,
      [email, passwordHash, fullName]
    );
    const userId = userResult.rows[0].user_id;

    await client.query(
      `INSERT INTO students (user_id, department_id, roll_number, phone, graduation_year)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, departmentId, rollNumber, phone || null, graduationYear]
    );

    await client.query('COMMIT');
    return findUserById(userId);
  } catch (err) {
    await client.query('ROLLBACK'); // undo BOTH inserts
    throw err;                      // the error handler turns it into a clean response
  } finally {
    client.release();               // always give the connection back to the pool
  }
};
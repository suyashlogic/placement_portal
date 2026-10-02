import { query } from '../config/db.js';

export const logAudit = async ({ userId = null, action, entityType, entityId = null, metadata = null }) => {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, entityType, entityId, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
};
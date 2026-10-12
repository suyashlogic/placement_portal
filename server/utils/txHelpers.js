import { sendTemplateToUser } from '../services/emailService.js';

// Small helpers shared by services that run inside a transaction. Each takes the
// transaction's `client` so the work commits or rolls back together with everything else.

// Tells the history trigger WHO is acting. "true" = lasts only until COMMIT/ROLLBACK.
export const setActor = (client, userId, remarks = '') =>
  client.query(`SELECT set_config('app.user_id', $1, true), set_config('app.remarks', $2, true)`,
    [String(userId), remarks]);

export const writeAudit = (client, userId, action, entityType, entityId, metadata = null) =>
  client.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, action, entityType, entityId, metadata ? JSON.stringify(metadata) : null]
  );

export const notify = (client, userId, title, message) =>
  client.query('INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)', [userId, title, message]);

// Queue ONE email. It is sent only after the surrounding transaction commits.
export const emailAfterCommit = (client, template, userId, data = {}) =>
  client.afterCommit(() => sendTemplateToUser(template, userId, data));

// Queue the same kind of email for many people: rows = [{ userId, data }]
export const emailManyAfterCommit = (client, template, rows) =>
  client.afterCommit(async () => {
    for (const row of rows) await sendTemplateToUser(template, row.userId, row.data);
  });

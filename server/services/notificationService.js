import { query } from '../config/db.js';

export const listNotifications = async (userId) => {
  const [rows, unread] = await Promise.all([
    query(
      `SELECT notification_id AS "notificationId", title, message, is_read AS "isRead", created_at AS "createdAt"
         FROM notifications WHERE user_id = $1 ORDER BY created_at DESC, notification_id DESC LIMIT 50`,
      [userId]
    ),
    query('SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND NOT is_read', [userId]),
  ]);
  return { notifications: rows.rows, unreadCount: unread.rows[0].n };
};

// The WHERE includes user_id, so nobody can mark someone else's notification
export const markRead = async (userId, notificationId) => {
  const result = await query(
    'UPDATE notifications SET is_read = TRUE WHERE notification_id = $1 AND user_id = $2',
    [notificationId, userId]
  );
  return result.rowCount > 0;
};

export const markAllRead = async (userId) => {
  const result = await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND NOT is_read', [userId]);
  return result.rowCount;
};

import * as service from '../services/notificationService.js';

export const getMine = async (req, res) => {
  res.json({ success: true, message: 'Notifications fetched', data: await service.listNotifications(req.user.user_id) });
};

export const read = async (req, res) => {
  const found = await service.markRead(req.user.user_id, req.idParam);
  if (!found) return res.status(404).json({ success: false, message: 'Notification not found' });
  res.json({ success: true, message: 'Marked as read', data: {} });
};

export const readAll = async (req, res) => {
  const count = await service.markAllRead(req.user.user_id);
  res.json({ success: true, message: 'All notifications marked as read', data: { count } });
};

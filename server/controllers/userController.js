import * as userService from '../services/userService.js';
import { logAudit } from '../services/auditService.js';

const notFound = (res) => res.status(404).json({ success: false, message: 'User not found' });

export const getUsers = async (req, res) => {
  res.json({ success: true, message: 'Users fetched', data: { users: await userService.listUsers() } });
};

export const addOfficer = async (req, res) => {
  const user = await userService.createOfficer(req.body, req.user.user_id);
  await logAudit({ userId: req.user.user_id, action: 'OFFICER_CREATE', entityType: 'user', entityId: user.userId });
  res.status(201).json({ success: true, message: 'Placement officer created', data: { user } });
};

export const setActive = async (req, res) => {
  const { isActive } = req.body;
  if (req.idParam === req.user.user_id && !isActive) {
    return res.status(400).json({ success: false, message: 'You cannot deactivate your own account' });
  }
  const user = await userService.setUserActive(req.idParam, isActive, req.user.user_id);
  if (!user) return notFound(res);
  await logAudit({
    userId: req.user.user_id, action: isActive ? 'USER_ACTIVATE' : 'USER_DEACTIVATE',
    entityType: 'user', entityId: user.userId,
  });
  res.json({ success: true, message: isActive ? 'Account activated' : 'Account deactivated', data: { user } });
};

export const resetPassword = async (req, res) => {
  const updated = await userService.resetUserPassword(req.idParam, req.body.password, req.user.user_id);
  if (!updated) return notFound(res);
  await logAudit({ userId: req.user.user_id, action: 'PASSWORD_RESET', entityType: 'user', entityId: req.idParam });
  res.json({ success: true, message: 'Password reset', data: {} });
};

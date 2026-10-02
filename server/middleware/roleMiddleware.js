export const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ success: false, message: 'Please log in to continue' });
  }
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'You do not have permission to do this' });
  }
  next();
};
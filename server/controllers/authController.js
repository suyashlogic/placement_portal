import passport from 'passport';
import { registerStudent } from '../services/authService.js';
import { logAudit } from '../services/auditService.js';
import { sendTemplateToUser } from '../services/emailService.js';

// Shape sent to React: camelCase, and never any password data
const toPublicUser = (user) => ({
  id: user.user_id,
  email: user.email,
  fullName: user.full_name,
  role: user.role,
  studentId: user.student_id ?? null,
});

export const register = async (req, res, next) => {
  const user = await registerStudent(req.body); // errors go to the central error handler
  await logAudit({ userId: user.user_id, action: 'REGISTER', entityType: 'user', entityId: user.user_id });

  // The registration transaction has already committed, so the welcome email is safe to send.
  // It is NOT awaited: the student does not wait for the mail server, and sendTemplateToUser never throws.
  sendTemplateToUser('welcome', user.user_id);

  // Log the new student in straight away
  req.login(user, (err) => {
    if (err) return next(err);
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user: toPublicUser(user) },
    });
  });
};

export const login = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ success: false, message: info?.message || 'Invalid email or password' });
    }

    req.login(user, async (loginErr) => {
      if (loginErr) return next(loginErr);
      await logAudit({ userId: user.user_id, action: 'LOGIN', entityType: 'user', entityId: user.user_id });
      res.json({
        success: true,
        message: 'Login successful',
        data: { user: toPublicUser(user) },
      });
    });
  })(req, res, next);
};

export const logout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((destroyErr) => {          // delete the session row in PostgreSQL
      if (destroyErr) return next(destroyErr);
      res.clearCookie('placement.sid');            // ask the browser to forget the cookie
      res.json({ success: true, message: 'Logged out' });
    });
  });
};

// React calls this on page load to find out "am I still logged in?"
export const me = (req, res) => {
  res.json({ success: true, message: 'Current user', data: { user: toPublicUser(req.user) } });
};

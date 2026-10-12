import { sendTemplate, emailStatus } from '../services/emailService.js';
import { sendDeadlineReminders } from '../services/reminderService.js';
import { closeExpiredDrives, expireStaleOffers } from '../services/maintenanceService.js';

export const getEmailStatus = (req, res) => {
  res.json({ success: true, message: 'Email status', data: emailStatus() });
};

// Sends a test message to the logged-in admin and WAITS for the result,
// so a wrong SMTP password shows up as a clear error instead of silence.
export const sendTestEmail = async (req, res) => {
  const result = await sendTemplate('test', req.user.email, { name: req.user.full_name });
  if (!result.ok) {
    return res.status(502).json({ success: false, message: `Email could not be sent: ${result.error}` });
  }
  const mode = emailStatus().mode;
  res.json({
    success: true,
    message: mode === 'dry-run'
      ? 'Dry-run: the email was built and logged in the server console, but not sent (EMAIL_HOST is empty).'
      : `Test email sent to ${req.user.email}`,
    data: { mode },
  });
};

export const runReminders = async (req, res) => {
  const result = await sendDeadlineReminders();
  res.json({
    success: true,
    message: result.reminded === 0
      ? 'No reminders were needed right now'
      : `Sent ${result.reminded} reminder(s) for ${result.drives} drive(s)`,
    data: result,
  });
};

// Runs the database maintenance procedures on demand (they also run by themselves where noted):
//   close_expired_drives()     OPEN drives past their registration deadline become CLOSED (hourly job too)
//   expire_stale_offers(days)  only when expireOffersAfterDays is sent: a policy decision, never automatic
export const runMaintenance = async (req, res) => {
  const days = req.body?.expireOffersAfterDays;
  if (days !== undefined && (!Number.isInteger(days) || days < 1 || days > 365)) {
    return res.status(400).json({ success: false, message: 'expireOffersAfterDays must be a whole number from 1 to 365' });
  }
  const closedDrives = await closeExpiredDrives();
  const expiredOffers = days === undefined ? null : await expireStaleOffers(days);
  res.json({
    success: true,
    message: `Closed ${closedDrives} drive(s)${expiredOffers === null ? '' : ` and expired ${expiredOffers} offer(s)`}`,
    data: { closedDrives, expiredOffers },
  });
};

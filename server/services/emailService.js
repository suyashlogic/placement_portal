import nodemailer from 'nodemailer';
import env from '../config/env.js';
import { query } from '../config/db.js';
import { templates } from '../templates/emailTemplates.js';
import { renderEmail } from '../templates/emailLayout.js';

// One transporter for the whole app, created the first time it is needed.
// No EMAIL_HOST in .env = DRY-RUN: nodemailer's jsonTransport builds the message but sends nothing,
// so a fresh install can never email real people by accident.
let transporter = null;

export const emailMode = () => (env.email.host ? 'smtp' : 'dry-run');

const getTransporter = () => {
  if (transporter) return transporter;
  transporter = env.email.host
    ? nodemailer.createTransport({
        host: env.email.host,
        port: env.email.port,
        secure: env.email.secure,
        auth: env.email.user ? { user: env.email.user, pass: env.email.password } : undefined,
        pool: true,             // reuse connections when sending many emails
        maxConnections: 3,
      })
    : nodemailer.createTransport({ jsonTransport: true });
  return transporter;
};

// The ONE place that sends. It never throws: it returns { ok, ... } so callers can't crash
// a request or a transaction because a mail server is slow or down.
export const sendMail = async ({ to, subject, html, text }) => {
  try {
    const info = await getTransporter().sendMail({ from: env.email.from, to, subject, html, text });
    console.log(`[email ${emailMode() === 'smtp' ? 'sent' : 'dry-run'}] to=${to} subject="${subject}"`);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[email FAILED] to=${to} subject="${subject}": ${err.message}`);
    return { ok: false, error: err.message };
  }
};

// Build an email from a template name and send it
export const sendTemplate = (name, to, data = {}) => {
  const build = templates[name];
  if (!build) {
    console.error(`[email FAILED] unknown template "${name}"`);
    return Promise.resolve({ ok: false, error: `Unknown template ${name}` });
  }
  return sendMail({ to, ...renderEmail(build(data), env.clientUrl) });
};

// Look up the person's address and name, then send. Inactive accounts get nothing.
export const sendTemplateToUser = async (name, userId, data = {}) => {
  try {
    const result = await query('SELECT email, full_name FROM users WHERE user_id = $1 AND is_active', [userId]);
    const user = result.rows[0];
    if (!user) return { ok: false, error: 'User not found or inactive' };
    return await sendTemplate(name, user.email, { name: user.full_name, ...data });
  } catch (err) {
    console.error(`[email FAILED] template="${name}" user=${userId}: ${err.message}`);
    return { ok: false, error: err.message };
  }
};

// Called once at startup so a wrong password shows up in the console immediately
export const verifyEmail = async () => {
  if (emailMode() === 'dry-run') {
    console.log('[email] DRY-RUN mode: set EMAIL_HOST in .env to send real emails (emails are only logged)');
    return;
  }
  try {
    await getTransporter().verify();
    console.log(`[email] SMTP ready: ${env.email.host}:${env.email.port}`);
  } catch (err) {
    console.error(`[email] SMTP connection FAILED: ${err.message}. Emails will fail until this is fixed.`);
  }
};

export const emailStatus = () => ({
  mode: emailMode(),
  host: env.email.host || null,
  port: env.email.host ? env.email.port : null,
  from: env.email.from,
});

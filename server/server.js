import app from './app.js';
import env from './config/env.js';
import { verifyEmail } from './services/emailService.js';
import { startReminderScheduler } from './services/reminderService.js';

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
  verifyEmail();                                   // logs whether SMTP works, never stops the server
  if (env.remindersEnabled) startReminderScheduler();
});

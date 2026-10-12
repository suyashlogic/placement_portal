import { query } from '../config/db.js';
import { withTransaction } from '../utils/withTransaction.js';
import { emailManyAfterCommit } from '../utils/txHelpers.js';
import { formatWhen } from '../utils/formatters.js';
import { closeExpiredDrives } from './maintenanceService.js';

const TITLE = 'Application deadline approaching';

// Finds OPEN drives closing within `withinHours` and reminds every ELIGIBLE student who has not applied.
//
// No "reminder sent" column exists, and we agreed not to change the schema silently, so the in-app
// notification IS the record: a student who already has this exact reminder is skipped. Running the
// job twice, or on every server restart, therefore never sends the same reminder twice.
export const sendDeadlineReminders = async ({ withinHours = 24 } = {}) => {
  const drives = await query(
    `SELECT p.drive_id AS "driveId", p.drive_title AS "driveTitle",
            p.registration_deadline AS deadline, c.company_name AS "companyName"
       FROM placement_drives p
       JOIN jobs j ON j.job_id = p.job_id
       JOIN companies c ON c.company_id = j.company_id
      WHERE p.status = 'OPEN'
        AND p.registration_deadline > NOW()
        AND p.registration_deadline <= NOW() + make_interval(hours => $1::int)`,
    [withinHours]
  );

  let reminded = 0;
  for (const d of drives.rows) {
    const deadline = formatWhen(d.deadline);
    const message = `Applications for ${d.driveTitle} close on ${deadline}.`;

    reminded += await withTransaction(async (client) => {
      // Two runs at the same moment take turns for this drive, so the second one finds
      // the notifications the first one just committed and skips those students.
      await client.query('SELECT pg_advisory_xact_lock(7002, $1)', [d.driveId]);

      const recipients = await client.query(
        `INSERT INTO notifications (user_id, title, message)
         SELECT u.user_id, $2::varchar, $3::text
           FROM students s
           JOIN users u ON u.user_id = s.user_id
           CROSS JOIN LATERAL check_student_eligibility(s.student_id, $1::int) AS e
          WHERE e.is_eligible AND u.is_active
            AND NOT EXISTS (SELECT 1 FROM applications a
                             WHERE a.student_id = s.student_id AND a.drive_id = $1::int)
            AND NOT EXISTS (SELECT 1 FROM applications a2
                             WHERE a2.student_id = s.student_id AND a2.application_status IN ('OFFERED', 'PLACED'))
            AND NOT EXISTS (SELECT 1 FROM notifications n
                             WHERE n.user_id = u.user_id AND n.title = $2::varchar AND n.message = $3::text)
         RETURNING user_id`,
        [d.driveId, TITLE, message]
      );

      const data = { driveId: d.driveId, driveTitle: d.driveTitle, companyName: d.companyName, deadline };
      emailManyAfterCommit(client, 'deadlineReminder', recipients.rows.map((r) => ({ userId: r.user_id, data })));
      return recipients.rowCount;
    });
  }
  return { drives: drives.rowCount, reminded };
};

// Checks once an hour (first check 30 seconds after the server starts)
export const startReminderScheduler = () => {
  const run = async () => {
    try {
      // First close drives whose deadline has passed (database procedure), then remind about the rest
      const closed = await closeExpiredDrives();
      if (closed > 0) console.log(`[maintenance] closed ${closed} drive(s) past their deadline`);

      const r = await sendDeadlineReminders();
      if (r.reminded > 0) console.log(`[reminders] sent ${r.reminded} reminder(s) for ${r.drives} drive(s)`);
    } catch (err) {
      console.error('[scheduler] failed:', err.message);
    }
  };

  setTimeout(run, 30 * 1000).unref();           // unref: a pending timer never keeps the process alive
  setInterval(run, 60 * 60 * 1000).unref();
  console.log('[scheduler] started: closes expired drives and sends reminders every hour');
};

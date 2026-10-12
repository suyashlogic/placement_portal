import { query } from '../config/db.js';
import { withTransaction } from '../utils/withTransaction.js';
import { httpError } from '../utils/httpError.js';
import { setActor, writeAudit, notify, emailAfterCommit, emailManyAfterCommit } from '../utils/txHelpers.js';

const TZ = 'Asia/Kolkata'; // used only for the wording of notifications
const when = (iso) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ }) : null;

// Locks the application row so two officers cannot change the same candidate at once.
// "FOR UPDATE OF a" locks only the applications row, not the joined tables.
const lockApplication = async (client, applicationId) => {
  const result = await client.query(
    `SELECT a.application_id AS "applicationId", a.application_status AS status,
            s.user_id AS "studentUserId", p.drive_title AS "driveTitle"
       FROM applications a
       JOIN students s ON s.student_id = a.student_id
       JOIN placement_drives p ON p.drive_id = a.drive_id
      WHERE a.application_id = $1
        FOR UPDATE OF a`,
    [applicationId]
  );
  return result.rows[0] || null;
};

// Adds the NEXT round to one application. The BEFORE INSERT trigger enforces the rules
// (shortlisted or interviewing, previous round passed); the AFTER INSERT trigger moves
// the application to INTERVIEW.
const insertRound = async (client, app, d, userId) => {
  const next = await client.query(
    'SELECT COALESCE(MAX(round_number), 0) + 1 AS n FROM selection_process WHERE application_id = $1',
    [app.applicationId]
  );
  const roundNumber = next.rows[0].n;

  const inserted = await client.query(
    `INSERT INTO selection_process (application_id, round_number, round_name, round_type, scheduled_at, location)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING selection_id AS "selectionId"`,
    [app.applicationId, roundNumber, d.roundName, d.roundType, d.scheduledAt, d.location]
  );
  const { selectionId } = inserted.rows[0];

  const details = [when(d.scheduledAt), d.location].filter(Boolean).join(' · ');
  await notify(client, app.studentUserId, `Round ${roundNumber} scheduled`,
    `${d.roundName} for ${app.driveTitle}${details ? `: ${details}` : '. Date to be announced.'}`);
  emailAfterCommit(client, 'roundScheduled', app.studentUserId, {
    driveTitle: app.driveTitle, roundNumber, roundName: d.roundName, roundType: d.roundType,
    when: when(d.scheduledAt), location: d.location, updated: false, applicationId: app.applicationId,
  });
  await writeAudit(client, userId, 'ROUND_CREATE', 'application', app.applicationId,
    { selectionId, roundNumber, roundName: d.roundName });
  return { selectionId, roundNumber };
};

export const createRound = (userId, d) =>
  withTransaction(async (client) => {
    await setActor(client, userId);
    const app = await lockApplication(client, d.applicationId);
    if (!app) return null;
    return insertRound(client, app, d, userId);
  });

// Same round for every candidate who is ready for one.
export const createRoundForDrive = (userId, driveId, d) =>
  withTransaction(async (client) => {
    await setActor(client, userId);

    const drive = await client.query('SELECT status FROM placement_drives WHERE drive_id = $1', [driveId]);
    if (!drive.rows[0]) return null;

    // Ready = shortlisted, or interviewing with the last round passed and nothing pending.
    // Locking in id order keeps concurrent officers from deadlocking each other.
    const ready = await client.query(
      `SELECT a.application_id
         FROM applications a
        WHERE a.drive_id = $1
          AND (a.application_status = 'SHORTLISTED'
               OR (a.application_status = 'INTERVIEW'
                   AND NOT EXISTS (SELECT 1 FROM selection_process sp
                                    WHERE sp.application_id = a.application_id AND sp.result = 'PENDING')
                   AND (SELECT sp2.result FROM selection_process sp2
                         WHERE sp2.application_id = a.application_id
                         ORDER BY sp2.round_number DESC LIMIT 1) = 'PASSED'))
        ORDER BY a.application_id
          FOR UPDATE OF a`,
      [driveId]
    );
    if (ready.rowCount === 0) throw httpError(409, 'No candidates are ready for a new round');

    for (const row of ready.rows) {
      const app = await lockApplication(client, row.application_id);
      await insertRound(client, app, d, userId);
    }
    return { created: ready.rowCount };
  });

// Reschedule or rename a round that has not happened yet
export const updateRound = (userId, selectionId, d) =>
  withTransaction(async (client) => {
    const found = await client.query(
      'SELECT application_id, round_number, result FROM selection_process WHERE selection_id = $1 FOR UPDATE', [selectionId]);
    const round = found.rows[0];
    if (!round) return null;
    if (round.result !== 'PENDING') throw httpError(409, 'A completed round cannot be edited');

    await client.query(
      `UPDATE selection_process SET round_name=$1, round_type=$2, scheduled_at=$3, location=$4
        WHERE selection_id=$5`,
      [d.roundName, d.roundType, d.scheduledAt, d.location, selectionId]
    );

    const app = await lockApplication(client, round.application_id);
    const details = [when(d.scheduledAt), d.location].filter(Boolean).join(' · ');
    await notify(client, app.studentUserId, 'Round updated',
      `${d.roundName} for ${app.driveTitle} was updated${details ? `: ${details}` : '.'}`);
    emailAfterCommit(client, 'roundScheduled', app.studentUserId, {
      driveTitle: app.driveTitle, roundNumber: round.round_number, roundName: d.roundName,
      roundType: d.roundType, when: when(d.scheduledAt), location: d.location,
      updated: true, applicationId: app.applicationId,
    });
    await writeAudit(client, userId, 'ROUND_UPDATE', 'application', app.applicationId, { selectionId });
    return { selectionId };
  });

// Record PASSED / FAILED / ABSENT. Triggers reject the application on FAILED/ABSENT.
export const recordResult = (userId, selectionId, { result, remarks, isFinal }) =>
  withTransaction(async (client) => {
    await setActor(client, userId);

    // Lock order is always: application first, then its round
    const found = await client.query('SELECT application_id FROM selection_process WHERE selection_id = $1', [selectionId]);
    if (!found.rows[0]) return null;
    const app = await lockApplication(client, found.rows[0].application_id);

    const roundResult = await client.query(
      `SELECT round_number AS "roundNumber", round_name AS "roundName", result
         FROM selection_process WHERE selection_id = $1 FOR UPDATE`, [selectionId]);
    const round = roundResult.rows[0];
    if (round.result !== 'PENDING') throw httpError(409, 'A result has already been recorded for this round');

    await client.query('UPDATE selection_process SET result = $1, remarks = $2 WHERE selection_id = $3',
      [result, remarks, selectionId]);

    const label = `Round ${round.roundNumber} (${round.roundName})`;

    if (result === 'PASSED') {
      await notify(client, app.studentUserId, 'Round cleared', `You passed ${label} for ${app.driveTitle}.`);
      if (isFinal) {
        await setActor(client, userId, `Passed final round: ${label}`);
        await client.query("UPDATE applications SET application_status = 'SELECTED' WHERE application_id = $1", [app.applicationId]);
        await notify(client, app.studentUserId, 'You have been selected', `You were selected for ${app.driveTitle}.`);
      }
    } else {
      await notify(client, app.studentUserId, 'Round result',
        result === 'ABSENT'
          ? `You were marked absent for ${label} of ${app.driveTitle}. Your application is closed.`
          : `You did not clear ${label} of ${app.driveTitle}. Your application is closed.`);
    }

    // Final round passed: one "selected" email. Otherwise one result email (never both).
    if (result === 'PASSED' && isFinal) {
      emailAfterCommit(client, 'selected', app.studentUserId,
        { driveTitle: app.driveTitle, applicationId: app.applicationId });
    } else {
      emailAfterCommit(client, 'roundResult', app.studentUserId, {
        driveTitle: app.driveTitle, roundNumber: round.roundNumber, roundName: round.roundName,
        result, applicationId: app.applicationId,
      });
    }
    await writeAudit(client, userId, 'ROUND_RESULT', 'application', app.applicationId,
      { selectionId, roundNumber: round.roundNumber, result, isFinal });

    const status = await client.query('SELECT application_status FROM applications WHERE application_id = $1', [app.applicationId]);
    return { selectionId, result, applicationStatus: status.rows[0].application_status };
  });

// Shortlist many applications in one transaction.
export const shortlistApplications = (userId, applicationIds) =>
  withTransaction(async (client) => {
    await setActor(client, userId, 'Reviewed and shortlisted');

    const locked = await client.query(
      `SELECT application_id AS id, application_status AS status
         FROM applications WHERE application_id = ANY($1::int[])
        ORDER BY application_id FOR UPDATE`,
      [applicationIds]
    );
    const byId = new Map(locked.rows.map((r) => [r.id, r.status]));

    const eligible = [];
    const skipped = [];
    for (const id of applicationIds) {
      const status = byId.get(id);
      if (status === undefined) skipped.push({ applicationId: id, reason: 'Not found' });
      else if (['APPLIED', 'UNDER_REVIEW'].includes(status)) eligible.push(id);
      else skipped.push({ applicationId: id, reason: `Already ${status.toLowerCase().replace('_', ' ')}` });
    }

    if (eligible.length > 0) {
      // APPLIED must pass through UNDER_REVIEW: the status trigger allows nothing else
      await client.query(
        "UPDATE applications SET application_status = 'UNDER_REVIEW' WHERE application_id = ANY($1::int[]) AND application_status = 'APPLIED'",
        [eligible]);
      await client.query(
        "UPDATE applications SET application_status = 'SHORTLISTED' WHERE application_id = ANY($1::int[]) AND application_status = 'UNDER_REVIEW'",
        [eligible]);

      // One INSERT ... SELECT notifies every student at once
      await client.query(
        `INSERT INTO notifications (user_id, title, message)
         SELECT s.user_id, 'You have been shortlisted',
                'Congratulations! You were shortlisted for ' || p.drive_title || '.'
           FROM applications a
           JOIN students s ON s.student_id = a.student_id
           JOIN placement_drives p ON p.drive_id = a.drive_id
          WHERE a.application_id = ANY($1::int[])`,
        [eligible]);
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
         SELECT $1, 'APPLICATION_SHORTLIST', 'application', id FROM unnest($2::int[]) AS id`,
        [userId, eligible]);

      // One email per shortlisted student, sent in the background after COMMIT
      const recipients = await client.query(
        `SELECT s.user_id AS "userId", a.application_id AS "applicationId", p.drive_title AS "driveTitle"
           FROM applications a
           JOIN students s ON s.student_id = a.student_id
           JOIN placement_drives p ON p.drive_id = a.drive_id
          WHERE a.application_id = ANY($1::int[])`,
        [eligible]);
      emailManyAfterCommit(client, 'shortlisted', recipients.rows.map((r) => ({
        userId: r.userId, data: { driveTitle: r.driveTitle, applicationId: r.applicationId },
      })));
    }
    return { shortlisted: eligible.length, skipped };
  });

// The selection board for one drive: candidates with their rounds
export const getSelectionBoard = async (driveId) => {
  const driveResult = await query(
    `SELECT p.drive_id AS "driveId", p.drive_title AS "driveTitle", p.status,
            c.company_name AS "companyName", j.job_title AS "jobTitle"
       FROM placement_drives p JOIN jobs j ON j.job_id = p.job_id JOIN companies c ON c.company_id = j.company_id
      WHERE p.drive_id = $1`, [driveId]);
  if (!driveResult.rows[0]) return null;

  const candidates = await query(
    `SELECT v.application_id AS "applicationId", v.student_name AS "studentName",
            v.roll_number AS "rollNumber", v.department_code AS "departmentCode", v.cgpa,
            v.application_status AS status,
            COALESCE((SELECT json_agg(json_build_object(
                        'selectionId', sp.selection_id, 'roundNumber', sp.round_number,
                        'roundName', sp.round_name, 'roundType', sp.round_type,
                        'scheduledAt', sp.scheduled_at, 'location', sp.location,
                        'result', sp.result, 'remarks', sp.remarks) ORDER BY sp.round_number)
                        FROM selection_process sp WHERE sp.application_id = v.application_id),
                     '[]'::json) AS rounds
       FROM student_application_view v
      WHERE v.drive_id = $1
        AND (v.application_status IN ('SHORTLISTED', 'INTERVIEW', 'SELECTED')
             OR EXISTS (SELECT 1 FROM selection_process sp WHERE sp.application_id = v.application_id))
      ORDER BY v.student_name`,
    [driveId]
  );
  return { drive: driveResult.rows[0], candidates: candidates.rows };
};

import { query } from '../config/db.js';
import { withTransaction } from '../utils/withTransaction.js';
import { httpError } from '../utils/httpError.js';
import { setActor, writeAudit, notify, emailAfterCommit } from '../utils/txHelpers.js';

const PAGE_SIZE = 15;
const WITHDRAWABLE = ['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED'];

const APP_COLS = `application_id AS "applicationId", student_id AS "studentId", drive_id AS "driveId",
  application_status AS "status", application_date AS "applicationDate", updated_at AS "updatedAt",
  drive_title AS "driveTitle", drive_status AS "driveStatus", drive_date AS "driveDate",
  company_name AS "companyName", job_title AS "jobTitle", job_location AS "jobLocation",
  min_package_lpa AS "minPackageLpa", max_package_lpa AS "maxPackageLpa",
  student_name AS "studentName", student_email AS "studentEmail", roll_number AS "rollNumber",
  cgpa, department_code AS "departmentCode"`;

// ---------------------------------------------------------------------------
// APPLY: the transaction that matters most in this project.
// ---------------------------------------------------------------------------
export const applyToDrive = (studentId, userId, driveId) =>
  withTransaction(async (client) => {
    await setActor(client, userId);

    // 1. Lock the drive row in SHARE mode. Applications can run side by side, but an
    //    officer closing/editing the drive (FOR UPDATE) must wait until we finish, or we
    //    wait for them and then see the new status. No "applied just as it closed".
    const driveResult = await client.query(
      `SELECT drive_title, status,
              (NOW() < registration_open_date) AS "notYetOpen",
              (NOW() > registration_deadline)  AS "deadlinePassed"
         FROM placement_drives WHERE drive_id = $1 FOR SHARE`,
      [driveId]
    );
    const drive = driveResult.rows[0];
    if (!drive || drive.status === 'DRAFT') throw httpError(404, 'Drive not found');
    if (drive.status !== 'OPEN') throw httpError(409, 'Registration is closed for this drive');
    if (drive.notYetOpen) throw httpError(409, 'Registration for this drive has not opened yet');
    if (drive.deadlinePassed) throw httpError(409, 'The registration deadline has passed');

    // 2. Lock the student row too, so their CGPA/department cannot change between the
    //    eligibility check and the insert.
    await client.query('SELECT 1 FROM students WHERE student_id = $1 FOR SHARE', [studentId]);

    // 3. Placement rule: a student who already holds an offer or placement cannot apply again.
    const hold = await client.query(
      `SELECT 1 FROM applications
        WHERE student_id = $1 AND application_status IN ('OFFERED', 'PLACED') LIMIT 1`,
      [studentId]
    );
    if (hold.rowCount > 0) throw httpError(409, 'You already hold an offer or placement, so you cannot apply to more drives');

    // 4. Friendly duplicate message. (The UNIQUE constraint is the real guard against races.)
    const duplicate = await client.query(
      'SELECT 1 FROM applications WHERE student_id = $1 AND drive_id = $2', [studentId, driveId]);
    if (duplicate.rowCount > 0) throw httpError(409, 'You have already applied to this drive');

    // 5. Eligibility: the same SQL function the drive list uses.
    const eligibility = await client.query(
      'SELECT is_eligible, reason FROM check_student_eligibility($1, $2)', [studentId, driveId]);
    if (!eligibility.rows[0].is_eligible) throw httpError(403, eligibility.rows[0].reason);

    // 6. Insert. Triggers re-validate and write the first history row.
    const inserted = await client.query(
      'INSERT INTO applications (student_id, drive_id) VALUES ($1, $2) RETURNING application_id',
      [studentId, driveId]
    );
    const applicationId = inserted.rows[0].application_id;

    // 7. Audit + in-app notification, inside the SAME transaction.
    await writeAudit(client, userId, 'APPLICATION_SUBMIT', 'application', applicationId, { driveId });
    await notify(client, userId, 'Application submitted', `You applied to ${drive.drive_title}.`);
    emailAfterCommit(client, 'applicationSubmitted', userId, { driveTitle: drive.drive_title, applicationId });

    return { applicationId, status: 'APPLIED' };
  });

// ---------------------------------------------------------------------------
// WITHDRAW (student)
// ---------------------------------------------------------------------------
export const withdrawApplication = (studentId, userId, applicationId) =>
  withTransaction(async (client) => {
    await setActor(client, userId, 'Withdrawn by student');
    const current = await client.query(
      'SELECT application_status FROM applications WHERE application_id = $1 AND student_id = $2 FOR UPDATE',
      [applicationId, studentId]
    );
    if (!current.rows[0]) return null;      // someone else's application looks like "not found"
    if (!WITHDRAWABLE.includes(current.rows[0].application_status)) {
      throw httpError(409, 'You can only withdraw while your application is applied, under review or shortlisted');
    }
    await client.query("UPDATE applications SET application_status = 'WITHDRAWN' WHERE application_id = $1", [applicationId]);
    await writeAudit(client, userId, 'APPLICATION_WITHDRAW', 'application', applicationId);
    return { applicationId, status: 'WITHDRAWN' };
  });

// ---------------------------------------------------------------------------
// STATUS CHANGE (officer / admin)
// ---------------------------------------------------------------------------
const STATUS_MESSAGES = {
  UNDER_REVIEW: (d) => ['Application under review', `Your application for ${d} is being reviewed.`],
  SHORTLISTED: (d) => ['You have been shortlisted', `Congratulations! You were shortlisted for ${d}.`],
  INTERVIEW: (d) => ['Interview stage', `You moved to the interview stage for ${d}.`],
  SELECTED: (d) => ['You have been selected', `You were selected for ${d}.`],
  REJECTED: (d) => ['Application update', `Your application for ${d} was not successful.`],
};

const EMAIL_FOR_STATUS = { SHORTLISTED: 'shortlisted', SELECTED: 'selected', REJECTED: 'applicationClosed' };

export const changeApplicationStatus = (applicationId, status, remarks, userId) =>
  withTransaction(async (client) => {
    await setActor(client, userId, remarks || '');

    // The BEFORE UPDATE trigger rejects illegal transitions and raises an error.
    const updated = await client.query(
      `UPDATE applications SET application_status = $1 WHERE application_id = $2 RETURNING student_id, drive_id`,
      [status, applicationId]
    );
    if (updated.rowCount === 0) return null;

    const info = await client.query(
      `SELECT s.user_id, p.drive_title
         FROM students s, placement_drives p
        WHERE s.student_id = $1 AND p.drive_id = $2`,
      [updated.rows[0].student_id, updated.rows[0].drive_id]
    );
    const [title, message] = STATUS_MESSAGES[status](info.rows[0].drive_title);
    await notify(client, info.rows[0].user_id, title, message);
    // Only the milestones that matter get an email. UNDER_REVIEW and INTERVIEW stay in-app only.
    const template = EMAIL_FOR_STATUS[status];
    if (template) {
      emailAfterCommit(client, template, info.rows[0].user_id,
        { driveTitle: info.rows[0].drive_title, applicationId });
    }
    await writeAudit(client, userId, 'APPLICATION_STATUS', 'application', applicationId, { status });
    return { applicationId, status };
  });

// ---------------------------------------------------------------------------
// READS
// ---------------------------------------------------------------------------
export const listMyApplications = async (studentId) => {
  const result = await query(
    `SELECT ${APP_COLS} FROM student_application_view
      WHERE student_id = $1 ORDER BY application_date DESC, application_id DESC`,
    [studentId]
  );
  return result.rows;
};

export const listApplicationsForStaff = async ({ driveId, status, page, search }) => {
  const result = await query(
    `SELECT ${APP_COLS}, COUNT(*) OVER()::int AS total
       FROM student_application_view
      WHERE ($1::int  IS NULL OR drive_id = $1::int)
        AND ($2::text IS NULL OR application_status = $2::text)
        AND ($3::text IS NULL OR student_name ILIKE '%' || $3::text || '%'
                              OR roll_number  ILIKE '%' || $3::text || '%')
      ORDER BY application_date DESC, application_id DESC
      LIMIT $4 OFFSET $5`,
    [driveId, status, search, PAGE_SIZE, (page - 1) * PAGE_SIZE]
  );
  return {
    applications: result.rows.map(({ total, ...row }) => row),
    total: result.rows[0]?.total ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
};

// studentId set  -> only that student's own application (students can't read others')
// includeActor   -> staff see who changed a status; students just see "Placement cell"
export const getApplicationDetail = async (applicationId, { studentId = null, includeActor = false } = {}) => {
  const appResult = await query(
    `SELECT ${APP_COLS} FROM student_application_view
      WHERE application_id = $1::int AND ($2::int IS NULL OR student_id = $2::int)`,
    [applicationId, studentId]
  );
  const application = appResult.rows[0];
  if (!application) return null;

  const [history, rounds] = await Promise.all([
    query(
      `SELECT h.history_id AS "historyId", h.old_status AS "oldStatus", h.new_status AS "newStatus",
              h.changed_at AS "changedAt", h.remarks,
              CASE WHEN $2::boolean THEN u.full_name END AS "changedByName"
         FROM application_status_history h LEFT JOIN users u ON u.user_id = h.changed_by
        WHERE h.application_id = $1 ORDER BY h.history_id`,
      [applicationId, includeActor]
    ),
    query(
      `SELECT selection_id AS "selectionId", round_number AS "roundNumber", round_name AS "roundName",
              round_type AS "roundType", scheduled_at AS "scheduledAt", location, result, remarks
         FROM selection_process WHERE application_id = $1 ORDER BY round_number`,
      [applicationId]
    ),
  ]);
  return { application, history: history.rows, rounds: rounds.rows };
};

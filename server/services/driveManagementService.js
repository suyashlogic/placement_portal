import { query } from '../config/db.js';
import { withTransaction } from '../utils/withTransaction.js';
import { httpError } from '../utils/httpError.js';
import { emailManyAfterCommit, setActor } from '../utils/txHelpers.js';
import { formatWhen, formatPackageRange } from '../utils/formatters.js';

// The drive status lifecycle. Anything not listed here is rejected.
const NEXT_STATUSES = {
  DRAFT: ['OPEN', 'CANCELLED'],
  OPEN: ['CLOSED', 'CANCELLED'],
  CLOSED: ['OPEN', 'COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const listDrivesForOfficer = async () => {
  const result = await query(
    `SELECT p.drive_id AS "driveId", p.drive_title AS "driveTitle",
            c.company_name AS "companyName", j.job_title AS "jobTitle", p.status,
            p.registration_open_date AS "registrationOpenDate",
            p.registration_deadline AS "registrationDeadline",
            p.drive_date AS "driveDate",
            (SELECT COUNT(*)::int FROM applications a WHERE a.drive_id = p.drive_id) AS "applicationCount"
       FROM placement_drives p
       JOIN jobs j      ON j.job_id = p.job_id
       JOIN companies c ON c.company_id = j.company_id
      ORDER BY p.drive_date DESC`
  );
  return result.rows;
};

export const getDriveForOfficer = async (driveId) => {
  const result = await query(
    `SELECT p.drive_id AS "driveId", p.job_id AS "jobId", p.drive_title AS "driveTitle",
            p.description, p.status,
            p.registration_open_date AS "registrationOpenDate",
            p.registration_deadline AS "registrationDeadline",
            p.drive_date AS "driveDate",
            COALESCE(e.min_cgpa, 0) AS "minCgpa", e.graduation_year AS "graduationYear",
            COALESCE((SELECT array_agg(ed.department_id ORDER BY ed.department_id)
                        FROM drive_eligible_departments ed
                       WHERE ed.drive_id = p.drive_id), '{}') AS "departmentIds"
       FROM placement_drives p
       LEFT JOIN drive_eligibility e ON e.drive_id = p.drive_id
      WHERE p.drive_id = $1`,
    [driveId]
  );
  return result.rows[0] || null;
};

// Writes the eligibility rule + allowed departments. Used by create and update.
const saveEligibility = async (client, driveId, d) => {
  await client.query(
    `INSERT INTO drive_eligibility (drive_id, min_cgpa, graduation_year)
     VALUES ($1, $2, $3)
     ON CONFLICT (drive_id) DO UPDATE
       SET min_cgpa = EXCLUDED.min_cgpa, graduation_year = EXCLUDED.graduation_year`,
    [driveId, d.minCgpa, d.graduationYear]
  );
  await client.query('DELETE FROM drive_eligible_departments WHERE drive_id = $1', [driveId]);
  if (d.departmentIds.length > 0) {
    await client.query(
      `INSERT INTO drive_eligible_departments (drive_id, department_id)
       SELECT $1::int, unnest($2::int[])`,
      [driveId, d.departmentIds]
    );
  }
};

// Drive + eligibility rule + departments: all or nothing.
export const createDrive = (d, userId) =>
  withTransaction(async (client) => {
    await setActor(client, userId);   // the audit trigger records who created the drive
    const job = await client.query('SELECT job_status FROM jobs WHERE job_id = $1', [d.jobId]);
    if (!job.rows[0]) throw httpError(400, 'Selected job does not exist');
    if (job.rows[0].job_status !== 'OPEN') throw httpError(409, 'This job is closed. Choose an open job.');

    const result = await client.query(
      `INSERT INTO placement_drives
         (job_id, drive_title, description, registration_open_date, registration_deadline,
          drive_date, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,'DRAFT',$7) RETURNING drive_id`,
      [d.jobId, d.driveTitle, d.description, d.registrationOpenDate,
       d.registrationDeadline, d.driveDate, userId]
    );
    const driveId = result.rows[0].drive_id;
    await saveEligibility(client, driveId, d);
    return driveId;
  });

export const updateDrive = (driveId, d, userId) =>
  withTransaction(async (client) => {
    await setActor(client, userId);
    // FOR UPDATE locks this row until COMMIT, so two officers cannot edit it at the same moment.
    const current = await client.query(
      'SELECT status, job_id FROM placement_drives WHERE drive_id = $1 FOR UPDATE',
      [driveId]
    );
    const drive = current.rows[0];
    if (!drive) return false;
    if (['COMPLETED', 'CANCELLED'].includes(drive.status)) {
      throw httpError(409, `A ${drive.status.toLowerCase()} drive cannot be edited`);
    }
    if (drive.job_id !== d.jobId) {
      const apps = await client.query('SELECT COUNT(*)::int AS n FROM applications WHERE drive_id = $1', [driveId]);
      if (apps.rows[0].n > 0) throw httpError(409, 'The job cannot be changed after students have applied');
    }

    await client.query(
      `UPDATE placement_drives
          SET job_id=$1, drive_title=$2, description=$3, registration_open_date=$4,
              registration_deadline=$5, drive_date=$6
        WHERE drive_id=$7`,
      [d.jobId, d.driveTitle, d.description, d.registrationOpenDate,
       d.registrationDeadline, d.driveDate, driveId]
    );
    await saveEligibility(client, driveId, d);
    return true;
  });

// Publishing a drive tells every ELIGIBLE student: an in-app notification (inside the transaction)
// and an email (after COMMIT). The eligibility decision is the same SQL function used everywhere.
const announceDrive = async (client, driveId) => {
  const info = await client.query(
    `SELECT p.drive_title AS "driveTitle", p.registration_deadline AS deadline,
            c.company_name AS "companyName", j.job_title AS "jobTitle",
            j.min_package_lpa AS min, j.max_package_lpa AS max
       FROM placement_drives p JOIN jobs j ON j.job_id = p.job_id JOIN companies c ON c.company_id = j.company_id
      WHERE p.drive_id = $1`,
    [driveId]
  );
  const d = info.rows[0];

  const recipients = await client.query(
    `INSERT INTO notifications (user_id, title, message)
     SELECT u.user_id, 'New placement drive', $2
       FROM students s
       JOIN users u ON u.user_id = s.user_id
       CROSS JOIN LATERAL check_student_eligibility(s.student_id, $1::int) AS e
      WHERE e.is_eligible AND u.is_active
     RETURNING user_id`,
    [driveId, `${d.companyName} opened a drive you are eligible for: ${d.driveTitle}.`]
  );

  const data = {
    driveId, driveTitle: d.driveTitle, companyName: d.companyName, jobTitle: d.jobTitle,
    deadline: formatWhen(d.deadline), packageRange: formatPackageRange(d.min, d.max),
  };
  emailManyAfterCommit(client, 'newDrive', recipients.rows.map((r) => ({ userId: r.user_id, data })));
};

export const changeDriveStatus = (driveId, newStatus, userId) =>
  withTransaction(async (client) => {
    await setActor(client, userId);
    const current = await client.query(
      'SELECT status, registration_deadline FROM placement_drives WHERE drive_id = $1 FOR UPDATE',
      [driveId]
    );
    const drive = current.rows[0];
    if (!drive) return null;

    if (!NEXT_STATUSES[drive.status].includes(newStatus)) {
      throw httpError(409, `A ${drive.status} drive cannot become ${newStatus}`);
    }
    if (newStatus === 'OPEN' && new Date(drive.registration_deadline) <= new Date()) {
      throw httpError(409, 'The registration deadline has already passed. Edit the dates first.');
    }

    await client.query('UPDATE placement_drives SET status = $1 WHERE drive_id = $2', [newStatus, driveId]);

    // Only the first publication announces the drive. Reopening a closed drive stays quiet.
    if (drive.status === 'DRAFT' && newStatus === 'OPEN') await announceDrive(client, driveId);

    return { driveId, status: newStatus };
  });

// The same SQL function students rely on, run for every student.
export const listEligibleStudents = async (driveId) => {
  const driveResult = await query(
    `SELECT p.drive_id AS "driveId", p.drive_title AS "driveTitle", p.status,
            c.company_name AS "companyName", j.job_title AS "jobTitle"
       FROM placement_drives p
       JOIN jobs j ON j.job_id = p.job_id JOIN companies c ON c.company_id = j.company_id
      WHERE p.drive_id = $1`,
    [driveId]
  );
  if (!driveResult.rows[0]) return null;

  const students = await query(
    `SELECT s.student_id AS "studentId", u.full_name AS "fullName", u.email,
            s.roll_number AS "rollNumber", d.department_code AS "departmentCode",
            s.cgpa, s.graduation_year AS "graduationYear",
            e.is_eligible AS "isEligible", e.reason,
            EXISTS (SELECT 1 FROM applications a
                     WHERE a.drive_id = $1::int AND a.student_id = s.student_id) AS "hasApplied"
       FROM students s
       JOIN users u       ON u.user_id = s.user_id
       JOIN departments d ON d.department_id = s.department_id
       CROSS JOIN LATERAL check_student_eligibility(s.student_id, $1::int) AS e
      WHERE u.is_active
      ORDER BY e.is_eligible DESC, s.cgpa DESC, u.full_name`,
    [driveId]
  );
  return { drive: driveResult.rows[0], students: students.rows };
};

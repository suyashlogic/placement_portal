import { query } from '../config/db.js';

export const listDrivesForStudent = async (studentId) => {
  const result = await query(
    `SELECT p.drive_id AS "driveId", p.drive_title AS "driveTitle",
            c.company_name AS "companyName", j.job_title AS "jobTitle",
            j.job_location AS "location",
            j.min_package_lpa AS "minPackageLpa", j.max_package_lpa AS "maxPackageLpa",
            p.registration_deadline AS "registrationDeadline", p.drive_date AS "driveDate",
            p.status,
            e.is_eligible AS "isEligible", e.reason AS "eligibilityReason",
            EXISTS (SELECT 1 FROM applications a
                     WHERE a.drive_id = p.drive_id AND a.student_id = $1::int) AS "hasApplied",
            (p.status <> 'OPEN'
              OR NOW() < p.registration_open_date
              OR NOW() > p.registration_deadline) AS "registrationClosed"
       FROM placement_drives p
       JOIN jobs j      ON j.job_id = p.job_id
       JOIN companies c ON c.company_id = j.company_id
       CROSS JOIN LATERAL check_student_eligibility($1::int, p.drive_id) AS e
      WHERE p.status IN ('OPEN', 'CLOSED')
      ORDER BY p.registration_deadline`,
    [studentId]
  );
  return result.rows;
};
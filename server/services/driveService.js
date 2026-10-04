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

export const getDriveDetailsForStudent = async (studentId, driveId) => {
  // Drafts are hidden from students, so a draft looks like "not found"
  const driveResult = await query(
    `SELECT p.drive_id AS "driveId", p.drive_title AS "driveTitle", p.description,
            p.registration_open_date AS "registrationOpenDate",
            p.registration_deadline AS "registrationDeadline",
            p.drive_date AS "driveDate", p.status,
            c.company_name AS "companyName", c.industry, c.website,
            c.description AS "companyDescription",
            j.job_id AS "jobId", j.job_title AS "jobTitle",
            j.job_description AS "jobDescription", j.job_location AS "location",
            j.employment_type AS "employmentType",
            j.min_package_lpa AS "minPackageLpa", j.max_package_lpa AS "maxPackageLpa",
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
      WHERE p.drive_id = $2::int AND p.status IN ('OPEN', 'CLOSED')`,
    [studentId, driveId]
  );
  const drive = driveResult.rows[0];
  if (!drive) return null;

  const studentResult = await query(
    `SELECT s.cgpa, s.graduation_year AS "graduationYear",
            s.department_id AS "departmentId", d.department_code AS "departmentCode"
       FROM students s JOIN departments d ON d.department_id = s.department_id
      WHERE s.student_id = $1`,
    [studentId]
  );
  const student = studentResult.rows[0];

  const [ruleResult, deptResult, skillResult] = await Promise.all([
    query(
      `SELECT min_cgpa AS "minCgpa", graduation_year AS "graduationYear"
         FROM drive_eligibility WHERE drive_id = $1`,
      [driveId]
    ),
    query(
      `SELECT d.department_code AS code, d.department_name AS name,
              (d.department_id = $2::int) AS "isYours"
         FROM drive_eligible_departments ed
         JOIN departments d ON d.department_id = ed.department_id
        WHERE ed.drive_id = $1::int ORDER BY d.department_code`,
      [driveId, student.departmentId]
    ),
    query(
      `SELECT k.skill_name AS "skillName", js.required_level AS "requiredLevel",
              COALESCE(ss.proficiency_level, 0) AS "yourLevel",
              (COALESCE(ss.proficiency_level, 0) >= js.required_level) AS met
         FROM job_skills js
         JOIN skills k ON k.skill_id = js.skill_id
         LEFT JOIN student_skills ss ON ss.skill_id = js.skill_id AND ss.student_id = $2::int
        WHERE js.job_id = $1::int ORDER BY k.skill_name`,
      [drive.jobId, studentId]
    ),
  ]);

  const rule = ruleResult.rows[0];
  const minCgpa = rule ? Number(rule.minCgpa) : 0;
  const requiredYear = rule?.graduationYear ?? null;

  return {
    ...drive,
    requirements: {
      minCgpa,
      yourCgpa: Number(student.cgpa),
      cgpaMet: Number(student.cgpa) >= minCgpa,
      graduationYear: requiredYear,
      yourGraduationYear: student.graduationYear,
      graduationYearMet: requiredYear === null || student.graduationYear === requiredYear,
      departments: deptResult.rows,           // empty = open to all
      yourDepartmentCode: student.departmentCode,
      departmentMet: deptResult.rows.length === 0 || deptResult.rows.some((d) => d.isYours),
      skills: skillResult.rows,
    },
  };
};

export const getDriveDetails = async (id) => (await api.get(`/drives/${id}`)).data.data.drive;
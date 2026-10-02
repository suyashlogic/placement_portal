import { query } from '../config/db.js';
import { listDrivesForStudent } from './driveService.js';

export const getProfile = async (studentId) => {
  const result = await query(
    `SELECT s.student_id AS "studentId", u.full_name AS "fullName", u.email,
            s.roll_number AS "rollNumber", s.phone,
            TO_CHAR(s.date_of_birth, 'YYYY-MM-DD') AS "dateOfBirth",
            s.cgpa, s.graduation_year AS "graduationYear",
            s.department_id AS "departmentId", d.department_name AS "departmentName",
            s.resume_path AS "resumePath"
       FROM students s
       JOIN users u       ON u.user_id = s.user_id
       JOIN departments d ON d.department_id = s.department_id
      WHERE s.student_id = $1`,
    [studentId]
  );
  return result.rows[0] || null;
};

export const updateProfile = async (studentId, data) => {
  await query(
    `UPDATE students
        SET department_id = $1, phone = $2, date_of_birth = $3, cgpa = $4, graduation_year = $5
      WHERE student_id = $6`,
    [data.departmentId, data.phone, data.dateOfBirth, data.cgpa, data.graduationYear, studentId]
  );
  return getProfile(studentId);
};

export const listAllSkills = async () => {
  const result = await query(
    `SELECT skill_id AS "skillId", skill_name AS "skillName" FROM skills ORDER BY skill_name`
  );
  return result.rows;
};

export const getStudentSkills = async (studentId) => {
  const result = await query(
    `SELECT k.skill_id AS "skillId", k.skill_name AS "skillName",
            ss.proficiency_level AS "proficiencyLevel"
       FROM student_skills ss JOIN skills k ON k.skill_id = ss.skill_id
      WHERE ss.student_id = $1 ORDER BY k.skill_name`,
    [studentId]
  );
  return result.rows;
};

export const saveStudentSkill = (studentId, skillId, level) =>
  query(
    `INSERT INTO student_skills (student_id, skill_id, proficiency_level)
     VALUES ($1, $2, $3)
     ON CONFLICT (student_id, skill_id) DO UPDATE SET proficiency_level = EXCLUDED.proficiency_level`,
    [studentId, skillId, level]
  );

export const removeStudentSkill = async (studentId, skillId) => {
  const result = await query(
    'DELETE FROM student_skills WHERE student_id = $1 AND skill_id = $2',
    [studentId, skillId]
  );
  return result.rowCount > 0;
};

export const getDashboard = async (studentId) => {
  const [profile, skills, drives, statusRows] = await Promise.all([
    getProfile(studentId),
    getStudentSkills(studentId),
    listDrivesForStudent(studentId),
    query(
      `SELECT application_status AS status, COUNT(*)::int AS count
         FROM applications WHERE student_id = $1 GROUP BY application_status`,
      [studentId]
    ),
  ]);

  const checks = [!!profile.phone, !!profile.dateOfBirth, Number(profile.cgpa) > 0,
                  !!profile.resumePath, skills.length > 0];
  const profileCompletion = Math.round((100 * checks.filter(Boolean).length) / checks.length);

  const openDrives = drives.filter((d) => !d.registrationClosed);
  const eligible = openDrives.filter((d) => d.isEligible && !d.hasApplied);

  return {
    profile,
    profileCompletion,
    skillCount: skills.length,
    openDrives: openDrives.length,
    eligibleDrives: eligible.length,
    applicationCount: statusRows.rows.reduce((sum, r) => sum + r.count, 0),
    topDrives: eligible.slice(0, 3),
  };
};
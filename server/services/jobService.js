import { query } from '../config/db.js';
import { withTransaction } from '../utils/withTransaction.js';

// jobId = null lists every job; a number returns just that job.
export const listJobs = async (jobId = null) => {
  const result = await query(
    `SELECT j.job_id AS "jobId", j.company_id AS "companyId", c.company_name AS "companyName",
            j.job_title AS "jobTitle", j.job_description AS "jobDescription",
            j.job_location AS "jobLocation", j.employment_type AS "employmentType",
            j.min_package_lpa AS "minPackageLpa", j.max_package_lpa AS "maxPackageLpa",
            j.job_status AS "jobStatus",
            COALESCE((SELECT json_agg(json_build_object(
                        'skillId', k.skill_id, 'skillName', k.skill_name,
                        'requiredLevel', js.required_level) ORDER BY k.skill_name)
                        FROM job_skills js JOIN skills k ON k.skill_id = js.skill_id
                       WHERE js.job_id = j.job_id), '[]'::json) AS skills
       FROM jobs j JOIN companies c ON c.company_id = j.company_id
      WHERE ($1::int IS NULL OR j.job_id = $1::int)
      ORDER BY c.company_name, j.job_title`,
    [jobId]
  );
  return result.rows;
};

const replaceSkills = async (client, jobId, skills) => {
  await client.query('DELETE FROM job_skills WHERE job_id = $1', [jobId]);
  if (skills.length === 0) return;
  await client.query(
    `INSERT INTO job_skills (job_id, skill_id, required_level)
     SELECT $1::int, * FROM unnest($2::int[], $3::int[])`,
    [jobId, skills.map((s) => s.skillId), skills.map((s) => s.requiredLevel)]
  );
};

// The job row and its skill rows must succeed together, so: one transaction.
export const createJob = (d) =>
  withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO jobs (company_id, job_title, job_description, job_location, employment_type,
                         min_package_lpa, max_package_lpa, job_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING job_id`,
      [d.companyId, d.jobTitle, d.jobDescription, d.jobLocation, d.employmentType,
       d.minPackageLpa, d.maxPackageLpa, d.jobStatus]
    );
    const jobId = result.rows[0].job_id;
    await replaceSkills(client, jobId, d.skills);
    return jobId;
  });

export const updateJob = (jobId, d) =>
  withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE jobs SET company_id=$1, job_title=$2, job_description=$3, job_location=$4,
              employment_type=$5, min_package_lpa=$6, max_package_lpa=$7, job_status=$8
        WHERE job_id=$9 RETURNING job_id`,
      [d.companyId, d.jobTitle, d.jobDescription, d.jobLocation, d.employmentType,
       d.minPackageLpa, d.maxPackageLpa, d.jobStatus, jobId]
    );
    if (result.rowCount === 0) return false;
    await replaceSkills(client, jobId, d.skills);
    return true;
  });

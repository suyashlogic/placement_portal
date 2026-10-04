import { query } from '../config/db.js';

const COLS = `c.company_id AS "companyId", c.company_name AS "companyName", c.industry, c.location,
  c.website, c.description, c.contact_person AS "contactPerson",
  c.contact_email AS "contactEmail", c.status, c.created_at AS "createdAt"`;

export const listCompanies = async () => {
  const result = await query(
    `SELECT ${COLS},
            (SELECT COUNT(*)::int FROM jobs j WHERE j.company_id = c.company_id) AS "jobCount"
       FROM companies c ORDER BY c.company_name`
  );
  return result.rows;
};

export const createCompany = async (d) => {
  const result = await query(
    `INSERT INTO companies (company_name, industry, location, website, description,
                            contact_person, contact_email, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING company_id AS "companyId"`,
    [d.companyName, d.industry, d.location, d.website, d.description, d.contactPerson, d.contactEmail, d.status]
  );
  return result.rows[0];
};

export const updateCompany = async (id, d) => {
  const result = await query(
    `UPDATE companies
        SET company_name=$1, industry=$2, location=$3, website=$4, description=$5,
            contact_person=$6, contact_email=$7, status=$8
      WHERE company_id=$9
      RETURNING company_id AS "companyId"`,
    [d.companyName, d.industry, d.location, d.website, d.description, d.contactPerson, d.contactEmail, d.status, id]
  );
  return result.rows[0] || null;
};

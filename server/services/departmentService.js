import { query } from '../config/db.js';

// Aliases convert snake_case columns to the camelCase React expects
export const listDepartments = async () => {
  const result = await query(
    `SELECT department_id AS "departmentId",
            department_name AS "departmentName",
            department_code AS "departmentCode"
       FROM departments
      ORDER BY department_name`
  );
  return result.rows;
};
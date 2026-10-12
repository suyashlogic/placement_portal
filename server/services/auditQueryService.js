import { query } from '../config/db.js';

const PAGE_SIZE = 25;

// All filters are optional: "($1::text IS NULL OR column = $1)" means "ignore this filter when it is not set".
// Everything is parameterised, so no filter value can ever become SQL.
export const listAuditLogs = async ({ kind, entityType, action, userId, from, to, page }) => {
  const result = await query(
    `SELECT l.audit_id AS "auditId", l.created_at AS "createdAt", l.action,
            l.entity_type AS "entityType", l.entity_id AS "entityId", l.metadata,
            l.user_id AS "userId", u.full_name AS "userName", u.role AS "userRole",
            COUNT(*) OVER()::int AS total
       FROM audit_logs l
       LEFT JOIN users u ON u.user_id = l.user_id
      WHERE ($1::text IS NULL
             OR ($1::text = 'DB'  AND     starts_with(l.action, 'DB_'))
             OR ($1::text = 'APP' AND NOT starts_with(l.action, 'DB_')))
        AND ($2::text IS NULL OR l.entity_type = $2::text)
        AND ($3::text IS NULL OR l.action = $3::text)
        AND ($4::int  IS NULL OR l.user_id = $4::int)
        AND ($5::date IS NULL OR l.created_at >= $5::date)
        AND ($6::date IS NULL OR l.created_at <  $6::date + 1)
      ORDER BY l.created_at DESC, l.audit_id DESC
      LIMIT $7 OFFSET $8`,
    [kind, entityType, action, userId, from, to, PAGE_SIZE, (page - 1) * PAGE_SIZE]
  );
  return {
    logs: result.rows.map(({ total, ...row }) => row),
    total: result.rows[0]?.total ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
};

// Values for the filter dropdowns
export const getAuditFilterOptions = async () => {
  const [actions, entityTypes] = await Promise.all([
    query('SELECT DISTINCT action FROM audit_logs ORDER BY action'),
    query('SELECT DISTINCT entity_type FROM audit_logs ORDER BY entity_type'),
  ]);
  return {
    actions: actions.rows.map((r) => r.action),
    entityTypes: entityTypes.rows.map((r) => r.entity_type),
  };
};

const reject = (res, message) => res.status(400).json({ success: false, message });
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

// Query-string filters for the audit viewer. Stored on req.filters (req.query is read-only in Express 5).
export const validateAuditQuery = (req, res, next) => {
  const q = req.query;
  const kind = q.kind ? String(q.kind) : null;
  const entityType = q.entityType ? String(q.entityType).slice(0, 50) : null;
  const action = q.action ? String(q.action).slice(0, 50) : null;
  const userId = q.userId ? Number(q.userId) : null;
  const from = q.from ? String(q.from) : null;
  const to = q.to ? String(q.to) : null;
  const page = q.page ? Number(q.page) : 1;

  if (kind !== null && !['APP', 'DB'].includes(kind)) return reject(res, 'Invalid kind filter');
  if (userId !== null && (!Number.isInteger(userId) || userId < 1)) return reject(res, 'Invalid user filter');
  for (const day of [from, to]) {
    if (day !== null && (!DAY_RE.test(day) || isNaN(Date.parse(day)))) return reject(res, 'Dates must look like 2026-10-31');
  }
  if (!Number.isInteger(page) || page < 1 || page > 100000) return reject(res, 'Invalid page');

  req.filters = { kind, entityType, action, userId, from, to, page };
  next();
};

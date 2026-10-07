const reject = (res, errors) => res.status(400).json({ success: false, message: errors[0], errors });
const isInt = (n, min = 1, max = 2147483647) => Number.isInteger(n) && n >= min && n <= max;

// Statuses an officer may set by hand. OFFERED and PLACED come from the offer and
// placement modules (Phase 8), and WITHDRAWN belongs to the student.
const STAFF_STATUSES = ['UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED'];
const ALL_STATUSES = [...STAFF_STATUSES, 'APPLIED', 'OFFERED', 'PLACED', 'WITHDRAWN'];

export const validateApply = (req, res, next) => {
  const driveId = Number(req.body?.driveId);
  if (!isInt(driveId)) return reject(res, ['Select a drive to apply to']);
  req.body = { driveId };
  next();
};

export const validateStatusChange = (req, res, next) => {
  const status = String(req.body?.status || '').trim();
  const remarks = String(req.body?.remarks || '').trim();
  if (!STAFF_STATUSES.includes(status)) return reject(res, ['Choose a valid status']);
  if (remarks.length > 500) return reject(res, ['Remarks must be 500 characters or fewer']);
  req.body = { status, remarks: remarks || null };
  next();
};

// Query string filters for the officer list. Stored on req.filters because
// req.query is read-only in Express 5.
export const validateApplicationQuery = (req, res, next) => {
  const q = req.query;
  const driveId = q.driveId ? Number(q.driveId) : null;
  const status = q.status ? String(q.status) : null;
  const page = q.page ? Number(q.page) : 1;
  const search = q.q ? String(q.q).trim().slice(0, 100) : null;

  if (driveId !== null && !isInt(driveId)) return reject(res, ['Invalid drive filter']);
  if (status !== null && !ALL_STATUSES.includes(status)) return reject(res, ['Invalid status filter']);
  if (!isInt(page, 1, 100000)) return reject(res, ['Invalid page']);

  req.filters = { driveId, status, page, search: search || null };
  next();
};

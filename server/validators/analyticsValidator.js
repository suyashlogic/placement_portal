const reject = (res, message) => res.status(400).json({ success: false, message });
const isInt = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;

// Optional query-string settings shared by the report endpoints. Missing values get a sensible default.
// Stored on req.filters because req.query is read-only in Express 5.
export const validateAnalyticsQuery = (req, res, next) => {
  const q = req.query;
  const year = q.year ? Number(q.year) : null;
  const months = q.months ? Number(q.months) : 12;
  const bucket = q.bucket ? Number(q.bucket) : 3;
  const driveId = q.driveId ? Number(q.driveId) : null;
  const limit = q.limit ? Number(q.limit) : 8;

  if (year !== null && !isInt(year, 2000, 2100)) return reject(res, 'Enter a valid graduation year');
  if (!isInt(months, 1, 36)) return reject(res, 'Months must be between 1 and 36');
  if (!isInt(bucket, 1, 20)) return reject(res, 'Bucket size must be between 1 and 20 LPA');
  if (driveId !== null && !isInt(driveId, 1, 2147483647)) return reject(res, 'Invalid drive');
  if (!isInt(limit, 1, 50)) return reject(res, 'Limit must be between 1 and 50');

  req.filters = { year, months, bucket, driveId, limit };
  next();
};

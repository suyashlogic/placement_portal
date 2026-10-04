import env from '../config/env.js';

export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

// Friendly messages keyed by constraint name (see schema.sql)
const constraintMessages = {
  uq_users_email: 'An account with this email already exists',
  students_roll_number_key: 'This roll number is already registered',
  students_department_id_fkey: 'Selected department does not exist',
  uq_one_application_per_drive: 'You have already applied to this drive',
  companies_company_name_key: 'A company with this name already exists',
  chk_drive_dates: 'Registration must open, then close, then the drive takes place',
  chk_job_package_range: 'Maximum package must be at least the minimum',
};

const fromPostgresError = (err) => {
  switch (err.code) {
    case '23505': // unique_violation
      return { status: 409, message: constraintMessages[err.constraint] || 'This record already exists' };
    case '23503': // foreign_key_violation
      return { status: 409, message: constraintMessages[err.constraint] || 'A related record is missing or still in use' };
    case '23514': // check_violation
      return { status: 400, message: constraintMessages[err.constraint] || 'A value breaks a database rule' };
    case '23502': // not_null_violation
      return { status: 400, message: 'A required field is missing' };
    default:
      return null;
  }
};

// Express recognizes error middleware by its four arguments
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Request body is not valid JSON' });
  }

  const pgError = fromPostgresError(err);
  if (pgError) {
    return res.status(pgError.status).json({ success: false, message: pgError.message });
  }

  const status = err.statusCode || 500;
  if (status >= 500) console.error(err); // expected 4xx errors don't need a stack trace in the log
  res.status(status).json({
    success: false,
    message:
      status === 500 && env.nodeEnv === 'production'
        ? 'Internal server error'
        : err.message || 'Internal server error',
  });
};

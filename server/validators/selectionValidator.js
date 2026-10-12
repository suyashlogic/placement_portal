const reject = (res, errors) => res.status(400).json({ success: false, message: errors[0], errors });
const text = (v) => String(v ?? '').trim();
const isInt = (n, min = 1, max = 2147483647) => Number.isInteger(n) && n >= min && n <= max;
const ROUND_TYPES = ['APTITUDE', 'CODING', 'TECHNICAL', 'HR', 'GROUP_DISCUSSION'];

// Checks the fields every round has. Returns { errors, round }.
const readRound = (b) => {
  const errors = [];
  const roundName = text(b.roundName);
  const roundType = text(b.roundType);
  const location = text(b.location);
  let scheduledAt = null;

  if (roundName.length < 2 || roundName.length > 100) errors.push('Round name must be 2 to 100 characters');
  if (!ROUND_TYPES.includes(roundType)) errors.push('Choose a valid round type');
  if (location.length > 255) errors.push('Location must be 255 characters or fewer');
  if (b.scheduledAt) {
    const d = new Date(b.scheduledAt);
    if (isNaN(d)) errors.push('Enter a valid date and time');
    else scheduledAt = d.toISOString();
  }
  return { errors, round: { roundName, roundType, scheduledAt, location: location || null } };
};

export const validateRoundForApplication = (req, res, next) => {
  const applicationId = Number(req.body?.applicationId);
  const { errors, round } = readRound(req.body ?? {});
  if (!isInt(applicationId)) errors.unshift('Choose an application');
  if (errors.length) return reject(res, errors);
  req.body = { applicationId, ...round };
  next();
};

// Used for "create this round for everyone ready" and for rescheduling
export const validateRound = (req, res, next) => {
  const { errors, round } = readRound(req.body ?? {});
  if (errors.length) return reject(res, errors);
  req.body = round;
  next();
};

export const validateResult = (req, res, next) => {
  const b = req.body ?? {};
  const result = text(b.result);
  const remarks = text(b.remarks);
  if (!['PASSED', 'FAILED', 'ABSENT'].includes(result)) return reject(res, ['Result must be PASSED, FAILED or ABSENT']);
  if (remarks.length > 500) return reject(res, ['Remarks must be 500 characters or fewer']);
  req.body = { result, remarks: remarks || null, isFinal: result === 'PASSED' && b.isFinal === true };
  next();
};

export const validateShortlist = (req, res, next) => {
  const ids = Array.isArray(req.body?.applicationIds) ? req.body.applicationIds.map(Number) : [];
  if (ids.length === 0) return reject(res, ['Select at least one application']);
  if (ids.length > 100) return reject(res, ['You can shortlist up to 100 applications at a time']);
  if (ids.some((id) => !isInt(id))) return reject(res, ['Invalid application selection']);
  req.body = { applicationIds: [...new Set(ids)] };
  next();
};

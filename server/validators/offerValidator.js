const reject = (res, errors) => res.status(400).json({ success: false, message: errors[0], errors });
const text = (v) => String(v ?? '').trim();
const isInt = (n, min = 1, max = 2147483647) => Number.isInteger(n) && n >= min && n <= max;
const round2 = (n) => Math.round(n * 100) / 100;

// Dates travel as plain "YYYY-MM-DD" strings so no time zone can shift them by a day
const validDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
const OFFER_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'];

const readPackage = (value, errors, label) => {
  const n = Number(value);
  if (!(n > 0 && n <= 1000)) errors.push(`${label} must be greater than 0`);
  return round2(n);
};

const readOffer = (b) => {
  const errors = [];
  const packageLpa = readPackage(b.packageLpa, errors, 'Package');
  const joiningDate = text(b.joiningDate);
  const remarks = text(b.remarks);
  if (joiningDate && !validDay(joiningDate)) errors.push('Enter a valid joining date');
  if (remarks.length > 500) errors.push('Remarks must be 500 characters or fewer');
  return { errors, offer: { packageLpa, joiningDate: joiningDate || null, remarks: remarks || null } };
};

export const validateNewOffer = (req, res, next) => {
  const applicationId = Number(req.body?.applicationId);
  const { errors, offer } = readOffer(req.body ?? {});
  if (!isInt(applicationId)) errors.unshift('Choose a selected candidate');
  if (errors.length) return reject(res, errors);
  req.body = { applicationId, ...offer };
  next();
};

export const validateOfferEdit = (req, res, next) => {
  const { errors, offer } = readOffer(req.body ?? {});
  if (errors.length) return reject(res, errors);
  req.body = offer;
  next();
};

export const validateDecision = (req, res, next) => {
  const decision = text(req.body?.decision);
  if (!['ACCEPT', 'REJECT'].includes(decision)) return reject(res, ['Decision must be ACCEPT or REJECT']);
  req.body = { decision };
  next();
};

export const validateOfferQuery = (req, res, next) => {
  const status = req.query.status ? String(req.query.status) : null;
  if (status !== null && !OFFER_STATUSES.includes(status)) return reject(res, ['Invalid status filter']);
  req.filters = { status };
  next();
};

export const validatePlacement = (req, res, next) => {
  const b = req.body ?? {};
  const errors = [];
  const offerId = Number(b.offerId);
  const hasPackage = b.finalPackageLpa !== '' && b.finalPackageLpa != null;
  const joiningDate = text(b.joiningDate);
  const placementDate = text(b.placementDate);

  if (!isInt(offerId)) errors.push('Choose an accepted offer');
  const finalPackageLpa = hasPackage ? readPackage(b.finalPackageLpa, errors, 'Final package') : null;
  if (joiningDate && !validDay(joiningDate)) errors.push('Enter a valid joining date');
  if (placementDate && !validDay(placementDate)) errors.push('Enter a valid placement date');

  if (errors.length) return reject(res, errors);
  req.body = { offerId, finalPackageLpa, joiningDate: joiningDate || null, placementDate: placementDate || null };
  next();
};

export const validatePlacementStatus = (req, res, next) => {
  if (text(req.body?.status) !== 'JOINED') return reject(res, ['The only status you can set is JOINED']);
  req.body = { status: 'JOINED' };
  next();
};

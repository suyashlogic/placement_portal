const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const reject = (res, errors) => res.status(400).json({ success: false, message: errors[0], errors });
const text = (v) => String(v ?? '').trim();
const orNull = (v) => text(v) || null;
const isInt = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
const round2 = (n) => Math.round(n * 100) / 100;

const passwordError = (password) =>
  password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)
    ? 'Password must be at least 8 characters with a letter and a number'
    : null;

export const validateIdParam = (req, res, next) => {
  const id = Number(req.params.id);
  if (!isInt(id, 1, 2147483647)) return reject(res, ['Invalid id']);
  req.idParam = id;
  next();
};

// ---------- Users (admin) ----------
export const validateOfficer = (req, res, next) => {
  const b = req.body ?? {};
  const errors = [];
  const fullName = text(b.fullName);
  const email = text(b.email).toLowerCase();
  const password = String(b.password || '');

  if (fullName.length < 2 || fullName.length > 150) errors.push('Full name must be 2 to 150 characters');
  if (!EMAIL_RE.test(email)) errors.push('Enter a valid email address');
  const pwError = passwordError(password);
  if (pwError) errors.push(pwError);

  if (errors.length) return reject(res, errors);
  req.body = { fullName, email, password };
  next();
};

export const validatePasswordReset = (req, res, next) => {
  const password = String(req.body?.password || '');
  const pwError = passwordError(password);
  if (pwError) return reject(res, [pwError]);
  req.body = { password };
  next();
};

export const validateActive = (req, res, next) => {
  if (typeof req.body?.isActive !== 'boolean') return reject(res, ['isActive must be true or false']);
  req.body = { isActive: req.body.isActive };
  next();
};

// ---------- Companies ----------
export const validateCompany = (req, res, next) => {
  const b = req.body ?? {};
  const errors = [];
  const companyName = text(b.companyName);
  const website = orNull(b.website);
  const contactEmail = orNull(b.contactEmail)?.toLowerCase() ?? null;
  const status = text(b.status) || 'ACTIVE';

  if (companyName.length < 2 || companyName.length > 150) errors.push('Company name must be 2 to 150 characters');
  if (website && !/^https?:\/\/\S+$/i.test(website)) errors.push('Website must start with http:// or https://');
  if (contactEmail && !EMAIL_RE.test(contactEmail)) errors.push('Enter a valid contact email');
  if (!['ACTIVE', 'INACTIVE'].includes(status)) errors.push('Invalid status');

  if (errors.length) return reject(res, errors);
  req.body = {
    companyName, website, contactEmail, status,
    industry: orNull(b.industry), location: orNull(b.location),
    description: orNull(b.description), contactPerson: orNull(b.contactPerson),
  };
  next();
};

// ---------- Jobs ----------
export const validateJob = (req, res, next) => {
  const b = req.body ?? {};
  const errors = [];
  const companyId = Number(b.companyId);
  const jobTitle = text(b.jobTitle);
  const employmentType = text(b.employmentType) || 'FULL_TIME';
  const jobStatus = text(b.jobStatus) || 'OPEN';
  const min = Number(b.minPackageLpa);
  const max = Number(b.maxPackageLpa);

  if (!isInt(companyId, 1, 2147483647)) errors.push('Select a company');
  if (jobTitle.length < 2 || jobTitle.length > 150) errors.push('Job title must be 2 to 150 characters');
  if (!['FULL_TIME', 'INTERNSHIP', 'CONTRACT'].includes(employmentType)) errors.push('Invalid employment type');
  if (!['OPEN', 'CLOSED'].includes(jobStatus)) errors.push('Invalid job status');
  if (!(min > 0 && min <= 1000)) errors.push('Minimum package must be greater than 0');
  if (!(max >= min && max <= 1000)) errors.push('Maximum package must be at least the minimum');

  const skills = (Array.isArray(b.skills) ? b.skills : []).map((s) => ({
    skillId: Number(s?.skillId),
    requiredLevel: Number(s?.requiredLevel),
  }));
  if (skills.some((s) => !isInt(s.skillId, 1, 2147483647) || !isInt(s.requiredLevel, 1, 5))) {
    errors.push('Each skill needs a valid skill and a level from 1 to 5');
  }
  if (new Set(skills.map((s) => s.skillId)).size !== skills.length) errors.push('A skill can only be added once');

  if (errors.length) return reject(res, errors);
  req.body = {
    companyId, jobTitle, employmentType, jobStatus, skills,
    jobDescription: orNull(b.jobDescription), jobLocation: orNull(b.jobLocation),
    minPackageLpa: round2(min), maxPackageLpa: round2(max),
  };
  next();
};

// ---------- Drives ----------
const parseDate = (v) => {
  const d = new Date(v);
  return v && !isNaN(d) ? d : null;
};

export const validateDrive = (req, res, next) => {
  const b = req.body ?? {};
  const errors = [];
  const jobId = Number(b.jobId);
  const driveTitle = text(b.driveTitle);
  const open = parseDate(b.registrationOpenDate);
  const deadline = parseDate(b.registrationDeadline);
  const driveDate = parseDate(b.driveDate);
  const minCgpa = Number(b.minCgpa === '' || b.minCgpa == null ? 0 : b.minCgpa);
  const hasYear = b.graduationYear !== '' && b.graduationYear != null;
  const graduationYear = hasYear ? Number(b.graduationYear) : null;
  const departmentIds = (Array.isArray(b.departmentIds) ? b.departmentIds : []).map(Number);

  if (!isInt(jobId, 1, 2147483647)) errors.push('Select a job');
  if (driveTitle.length < 3 || driveTitle.length > 200) errors.push('Drive title must be 3 to 200 characters');
  if (!open || !deadline || !driveDate) errors.push('Enter all three dates');
  else if (!(open < deadline)) errors.push('Registration must close after it opens');
  else if (deadline > driveDate) errors.push('The drive date must be on or after the registration deadline');
  if (isNaN(minCgpa) || minCgpa < 0 || minCgpa > 10) errors.push('Minimum CGPA must be between 0 and 10');
  if (hasYear && !isInt(graduationYear, 2000, 2100)) errors.push('Enter a valid graduation year');
  if (departmentIds.some((d) => !isInt(d, 1, 2147483647))) errors.push('Invalid department selection');

  if (errors.length) return reject(res, errors);
  req.body = {
    jobId, driveTitle, graduationYear,
    description: orNull(b.description),
    registrationOpenDate: open.toISOString(),
    registrationDeadline: deadline.toISOString(),
    driveDate: driveDate.toISOString(),
    minCgpa: round2(minCgpa),
    departmentIds: [...new Set(departmentIds)],
  };
  next();
};

export const validateDriveStatus = (req, res, next) => {
  const status = text(req.body?.status);
  if (!['OPEN', 'CLOSED', 'COMPLETED', 'CANCELLED'].includes(status)) return reject(res, ['Invalid status']);
  req.body = { status };
  next();
};

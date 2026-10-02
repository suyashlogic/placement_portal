const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+ -]{10,15}$/;

const reject = (res, errors) =>
  res.status(400).json({ success: false, message: errors[0], errors });

export const validateLogin = (req, res, next) => {
  const body = req.body ?? {};
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!EMAIL_RE.test(email) || !password) {
    return reject(res, ['Email and password are required']);
  }
  req.body = { email, password };
  next();
};

export const validateRegister = (req, res, next) => {
  const body = req.body ?? {};
  const errors = [];

  const fullName = String(body.fullName || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const rollNumber = String(body.rollNumber || '').trim().toUpperCase();
  const phone = String(body.phone || '').trim();
  const departmentId = Number(body.departmentId);
  const graduationYear = Number(body.graduationYear);

  if (fullName.length < 2 || fullName.length > 150) errors.push('Full name must be 2 to 150 characters');
  if (!EMAIL_RE.test(email)) errors.push('Enter a valid email address');
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    errors.push('Password must be at least 8 characters with a letter and a number');
  }
  if (!rollNumber || rollNumber.length > 30) errors.push('Enter a valid roll number');
  if (!Number.isInteger(departmentId) || departmentId < 1) errors.push('Select a department');
  if (!Number.isInteger(graduationYear) || graduationYear < 2000 || graduationYear > 2100) {
    errors.push('Enter a valid graduation year');
  }
  if (phone && !PHONE_RE.test(phone)) errors.push('Enter a valid phone number');

  if (errors.length > 0) return reject(res, errors);

  // Only whitelisted, cleaned fields move on. Notice that "role" is NOT copied from the request,
  // so nobody can register themselves as ADMIN by sending role: "ADMIN".
  req.body = { fullName, email, password, rollNumber, phone, departmentId, graduationYear };
  next();
};
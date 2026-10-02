const PHONE_RE = /^[0-9+ -]{10,15}$/;
const reject = (res, errors) => res.status(400).json({ success: false, message: errors[0], errors });

export const validateProfile = (req, res, next) => {
  const b = req.body ?? {};
  const errors = [];

  const phone = String(b.phone || '').trim();
  const dateOfBirth = String(b.dateOfBirth || '').trim();
  const departmentId = Number(b.departmentId);
  const graduationYear = Number(b.graduationYear);
  const cgpa = Number(b.cgpa);

  if (phone && !PHONE_RE.test(phone)) errors.push('Enter a valid phone number');
  if (dateOfBirth && (isNaN(Date.parse(dateOfBirth)) || new Date(dateOfBirth) >= new Date())) {
    errors.push('Enter a valid date of birth');
  }
  if (!Number.isInteger(departmentId) || departmentId < 1) errors.push('Select a department');
  if (!Number.isInteger(graduationYear) || graduationYear < 2000 || graduationYear > 2100) {
    errors.push('Enter a valid graduation year');
  }
  if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) errors.push('CGPA must be between 0 and 10');

  if (errors.length) return reject(res, errors);

  req.body = {
    phone: phone || null,
    dateOfBirth: dateOfBirth || null,
    departmentId, graduationYear,
    cgpa: Math.round(cgpa * 100) / 100,
  };
  next();
};

export const validateSkill = (req, res, next) => {
  const skillId = Number(req.body?.skillId);
  const proficiencyLevel = Number(req.body?.proficiencyLevel);
  if (!Number.isInteger(skillId) || skillId < 1) return reject(res, ['Select a skill']);
  if (!Number.isInteger(proficiencyLevel) || proficiencyLevel < 1 || proficiencyLevel > 5) {
    return reject(res, ['Proficiency must be between 1 and 5']);
  }
  req.body = { skillId, proficiencyLevel };
  next();
};
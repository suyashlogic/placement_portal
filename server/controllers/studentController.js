import * as studentService from '../services/studentService.js';
import { logAudit } from '../services/auditService.js';
import fs from 'fs';
import path from 'path';
import { UPLOADS_ROOT, deleteUpload } from '../utils/uploadPaths.js';

const ok = (res, message, data) => res.json({ success: true, message, data });

export const getMyProfile = async (req, res) => {
  const profile = await studentService.getProfile(req.user.student_id);
  if (!profile) return res.status(404).json({ success: false, message: 'Student profile not found' });
  ok(res, 'Profile fetched', { profile });
};

export const updateMyProfile = async (req, res) => {
  const profile = await studentService.updateProfile(req.user.student_id, req.body);
  await logAudit({ userId: req.user.user_id, action: 'STUDENT_UPDATE', entityType: 'student', entityId: req.user.student_id });
  ok(res, 'Profile updated', { profile });
};

export const getMyDashboard = async (req, res) => {
  ok(res, 'Dashboard fetched', await studentService.getDashboard(req.user.student_id));
};

export const getMySkills = async (req, res) => {
  ok(res, 'Skills fetched', { skills: await studentService.getStudentSkills(req.user.student_id) });
};

export const saveMySkill = async (req, res) => {
  await studentService.saveStudentSkill(req.user.student_id, req.body.skillId, req.body.proficiencyLevel);
  ok(res, 'Skill saved', {});
};

export const removeMySkill = async (req, res) => {
  const skillId = Number(req.params.skillId);
  if (!Number.isInteger(skillId)) return res.status(400).json({ success: false, message: 'Invalid skill id' });
  const removed = await studentService.removeStudentSkill(req.user.student_id, skillId);
  if (!removed) return res.status(404).json({ success: false, message: 'Skill not found on your profile' });
  ok(res, 'Skill removed', {});
};

export const getSkillCatalog = async (req, res) => {
  ok(res, 'Skills fetched', { skills: await studentService.listAllSkills() });
};

export const uploadMyResume = async (req, res) => {
  const relativePath = `resumes/${req.file.filename}`;
  try {
    const oldPath = await studentService.saveResumePath(req.user.student_id, relativePath);
    if (oldPath) await deleteUpload(oldPath);   // replace, don't pile up old resumes
  } catch (err) {
    await fs.promises.unlink(req.file.path).catch(() => {}); // DB failed: remove the new file
    throw err;
  }
  await logAudit({ userId: req.user.user_id, action: 'RESUME_UPLOAD', entityType: 'student', entityId: req.user.student_id });
  ok(res, 'Resume uploaded', { resumePath: relativePath });
};

export const downloadMyResume = async (req, res) => {
  const profile = await studentService.getProfile(req.user.student_id);
  if (!profile?.resumePath) {
    return res.status(404).json({ success: false, message: 'No resume uploaded yet' });
  }
  const fullPath = path.join(UPLOADS_ROOT, profile.resumePath);
  res.download(fullPath, `resume${path.extname(fullPath)}`, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ success: false, message: 'Resume file not found' });
    }
  });
};
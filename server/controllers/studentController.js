import * as studentService from '../services/studentService.js';
import { logAudit } from '../services/auditService.js';

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
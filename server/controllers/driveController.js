import { listDrivesForStudent } from '../services/driveService.js';

export const getDrives = async (req, res) => {
  const drives = await listDrivesForStudent(req.user.student_id);
  res.json({ success: true, message: 'Drives fetched', data: { drives } });
};
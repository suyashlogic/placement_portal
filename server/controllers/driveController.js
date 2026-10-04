import { listDrivesForStudent, getDriveDetailsForStudent } from '../services/driveService.js';
import * as management from '../services/driveManagementService.js';
import { logAudit } from '../services/auditService.js';

const isStudent = (req) => req.user.role === 'STUDENT';
const notFound = (res) => res.status(404).json({ success: false, message: 'Drive not found' });

// One URL, two audiences: the data returned depends on the role in the session.
export const getDrives = async (req, res) => {
  const drives = isStudent(req)
    ? await listDrivesForStudent(req.user.student_id)
    : await management.listDrivesForOfficer();
  res.json({ success: true, message: 'Drives fetched', data: { drives } });
};

export const getDriveById = async (req, res) => {
  const drive = isStudent(req)
    ? await getDriveDetailsForStudent(req.user.student_id, req.idParam)
    : await management.getDriveForOfficer(req.idParam);
  if (!drive) return notFound(res);
  res.json({ success: true, message: 'Drive fetched', data: { drive } });
};

export const addDrive = async (req, res) => {
  const driveId = await management.createDrive(req.body, req.user.user_id);
  await logAudit({ userId: req.user.user_id, action: 'DRIVE_CREATE', entityType: 'drive', entityId: driveId });
  const drive = await management.getDriveForOfficer(driveId);
  res.status(201).json({ success: true, message: 'Drive created as a draft', data: { drive } });
};

export const editDrive = async (req, res) => {
  const updated = await management.updateDrive(req.idParam, req.body);
  if (!updated) return notFound(res);
  await logAudit({ userId: req.user.user_id, action: 'DRIVE_UPDATE', entityType: 'drive', entityId: req.idParam });
  const drive = await management.getDriveForOfficer(req.idParam);
  res.json({ success: true, message: 'Drive updated', data: { drive } });
};

export const setDriveStatus = async (req, res) => {
  const result = await management.changeDriveStatus(req.idParam, req.body.status);
  if (!result) return notFound(res);
  await logAudit({
    userId: req.user.user_id, action: 'DRIVE_STATUS', entityType: 'drive',
    entityId: req.idParam, metadata: { status: result.status },
  });
  res.json({ success: true, message: `Drive is now ${result.status}`, data: result });
};

export const getEligibleStudents = async (req, res) => {
  const result = await management.listEligibleStudents(req.idParam);
  if (!result) return notFound(res);
  res.json({ success: true, message: 'Eligibility computed', data: result });
};

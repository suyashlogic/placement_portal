import * as service from '../services/applicationService.js';

const isStudent = (req) => req.user.role === 'STUDENT';
const notFound = (res) => res.status(404).json({ success: false, message: 'Application not found' });

export const applyForDrive = async (req, res) => {
  // The student comes from the session. The request only says WHICH drive.
  const application = await service.applyToDrive(req.user.student_id, req.user.user_id, req.body.driveId);
  res.status(201).json({ success: true, message: 'Application submitted successfully', data: { application } });
};

export const getApplications = async (req, res) => {
  const data = isStudent(req)
    ? { applications: await service.listMyApplications(req.user.student_id) }
    : await service.listApplicationsForStaff(req.filters);
  res.json({ success: true, message: 'Applications fetched', data });
};

export const getApplication = async (req, res) => {
  const detail = isStudent(req)
    ? await service.getApplicationDetail(req.idParam, { studentId: req.user.student_id })
    : await service.getApplicationDetail(req.idParam, { includeActor: true });
  if (!detail) return notFound(res);
  res.json({ success: true, message: 'Application fetched', data: detail });
};

export const withdraw = async (req, res) => {
  const result = await service.withdrawApplication(req.user.student_id, req.user.user_id, req.idParam);
  if (!result) return notFound(res);
  res.json({ success: true, message: 'Application withdrawn', data: result });
};

export const updateStatus = async (req, res) => {
  const result = await service.changeApplicationStatus(req.idParam, req.body.status, req.body.remarks, req.user.user_id);
  if (!result) return notFound(res);
  res.json({ success: true, message: `Application is now ${result.status}`, data: result });
};

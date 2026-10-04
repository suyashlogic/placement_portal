import * as jobService from '../services/jobService.js';
import { logAudit } from '../services/auditService.js';

export const getJobs = async (req, res) => {
  res.json({ success: true, message: 'Jobs fetched', data: { jobs: await jobService.listJobs() } });
};

export const addJob = async (req, res) => {
  const jobId = await jobService.createJob(req.body);
  await logAudit({ userId: req.user.user_id, action: 'JOB_CREATE', entityType: 'job', entityId: jobId });
  const [job] = await jobService.listJobs(jobId);
  res.status(201).json({ success: true, message: 'Job created', data: { job } });
};

export const editJob = async (req, res) => {
  const updated = await jobService.updateJob(req.idParam, req.body);
  if (!updated) return res.status(404).json({ success: false, message: 'Job not found' });
  await logAudit({ userId: req.user.user_id, action: 'JOB_UPDATE', entityType: 'job', entityId: req.idParam });
  const [job] = await jobService.listJobs(req.idParam);
  res.json({ success: true, message: 'Job updated', data: { job } });
};

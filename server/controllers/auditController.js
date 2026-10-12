import { listAuditLogs, getAuditFilterOptions } from '../services/auditQueryService.js';

export const getLogs = async (req, res) => {
  res.json({ success: true, message: 'Audit log fetched', data: await listAuditLogs(req.filters) });
};

export const getFilterOptions = async (req, res) => {
  res.json({ success: true, message: 'Filter options fetched', data: await getAuditFilterOptions() });
};

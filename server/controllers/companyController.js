import * as companyService from '../services/companyService.js';
import { logAudit } from '../services/auditService.js';

export const getCompanies = async (req, res) => {
  const companies = await companyService.listCompanies();
  res.json({ success: true, message: 'Companies fetched', data: { companies } });
};

export const addCompany = async (req, res) => {
  const company = await companyService.createCompany(req.body);
  await logAudit({ userId: req.user.user_id, action: 'COMPANY_CREATE', entityType: 'company', entityId: company.companyId });
  res.status(201).json({ success: true, message: 'Company created', data: { company } });
};

export const editCompany = async (req, res) => {
  const company = await companyService.updateCompany(req.idParam, req.body);
  if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
  await logAudit({ userId: req.user.user_id, action: 'COMPANY_UPDATE', entityType: 'company', entityId: company.companyId });
  res.json({ success: true, message: 'Company updated', data: { company } });
};

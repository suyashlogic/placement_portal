import * as service from '../services/analyticsService.js';

// Each handler is one line of real work: the numbers are produced by PostgreSQL.
const send = (res, message, data) => res.json({ success: true, message, data });

export const overview = async (req, res) => send(res, 'Overview fetched', { overview: await service.getOverview() });
export const departmentPlacement = async (req, res) =>
  send(res, 'Department placement fetched', { departments: await service.getDepartmentPlacement(req.filters.year) });
export const companyHiring = async (req, res) =>
  send(res, 'Company hiring fetched', { companies: await service.getCompanyHiring(req.filters.limit) });
export const packageStatistics = async (req, res) =>
  send(res, 'Package statistics fetched', await service.getPackageStatistics(req.filters.bucket));
export const driveSelection = async (req, res) =>
  send(res, 'Drive selection fetched', { drives: await service.getDriveSelection(req.filters.driveId) });
export const funnel = async (req, res) => send(res, 'Funnel fetched', { funnel: await service.getFunnel(req.filters.driveId) });
export const placementTrends = async (req, res) =>
  send(res, 'Placement trends fetched', { trends: await service.getPlacementTrends(req.filters.months) });
export const statusBreakdown = async (req, res) =>
  send(res, 'Status breakdown fetched', { breakdown: await service.getStatusBreakdown() });

export const staffDashboard = async (req, res) => send(res, 'Dashboard fetched', await service.getStaffDashboard());
export const adminDashboard = async (req, res) => send(res, 'Dashboard fetched', await service.getAdminDashboard());
export const myInsights = async (req, res) =>
  send(res, 'Insights fetched', await service.getStudentInsights(req.user.student_id));

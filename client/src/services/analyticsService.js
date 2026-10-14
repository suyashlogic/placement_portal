import api from './api';

const get = async (url, params) => (await api.get(`/analytics${url}`, { params })).data.data;

// Staff reports. Optional arguments become query-string settings; empty values are left out.
export const getOverview = async () => (await get('/overview')).overview;
export const getDepartmentPlacement = async (year) => (await get('/department-placement', { year: year || undefined })).departments;
export const getCompanyHiring = async (limit = 8) => (await get('/company-hiring', { limit })).companies;
export const getPackageStatistics = (bucket = 3) => get('/package-statistics', { bucket });          // { statistics, distribution }
export const getDriveSelection = async (driveId) => (await get('/drive-selection', { driveId: driveId || undefined })).drives;
export const getFunnel = async (driveId) => (await get('/funnel', { driveId: driveId || undefined })).funnel;
export const getPlacementTrends = async (months = 12) => (await get('/placement-trends', { months })).trends;
export const getStatusBreakdown = async () => (await get('/status-breakdown')).breakdown;

// Whole-page dashboards
export const getOfficerDashboard = () => get('/dashboard/officer');
export const getAdminDashboard = () => get('/dashboard/admin');

// A student's own insights (the server uses the logged-in student, nothing is sent)
export const getMyInsights = () => get('/me');

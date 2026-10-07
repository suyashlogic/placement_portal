import api from './api';

// ----- Student -----
export const applyToDrive = async (driveId) =>
  (await api.post('/applications', { driveId })).data.data.application;
export const getMyApplications = async () => (await api.get('/applications')).data.data.applications;
export const withdrawApplication = (id) => api.patch(`/applications/${id}/withdraw`);

// ----- Shared: the server decides what each role may see -----
export const getApplication = async (id) => (await api.get(`/applications/${id}`)).data.data; // { application, history, rounds }

// ----- Officer / admin -----
export const getApplicationsForStaff = async (params) =>
  (await api.get('/applications', { params })).data.data;                                       // { applications, total, page, pageSize }
export const changeApplicationStatus = (id, status, remarks) =>
  api.patch(`/applications/${id}/status`, { status, remarks });

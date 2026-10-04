import api from './api';

// ----- Student side (same URLs, the server returns student-shaped data) -----
export const getDrives = async () => (await api.get('/drives')).data.data.drives;
export const getDriveDetails = async (id) => (await api.get(`/drives/${id}`)).data.data.drive;

// ----- Officer / admin side -----
export const getManagedDrives = async () => (await api.get('/drives')).data.data.drives;
export const getManagedDrive = async (id) => (await api.get(`/drives/${id}`)).data.data.drive;
export const createDrive = async (payload) => (await api.post('/drives', payload)).data.data.drive;
export const updateDrive = async (id, payload) => (await api.put(`/drives/${id}`, payload)).data.data.drive;
export const changeDriveStatus = async (id, status) =>
  (await api.patch(`/drives/${id}/status`, { status })).data.data;
export const getEligibleStudents = async (id) => (await api.get(`/drives/${id}/eligible-students`)).data.data;

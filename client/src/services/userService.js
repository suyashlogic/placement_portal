import api from './api';

export const getUsers = async () => (await api.get('/users')).data.data.users;
export const createOfficer = async (form) => (await api.post('/users/officers', form)).data.data.user;
export const setUserActive = async (id, isActive) =>
  (await api.patch(`/users/${id}/active`, { isActive })).data.data.user;
export const resetUserPassword = (id, password) => api.patch(`/users/${id}/password`, { password });

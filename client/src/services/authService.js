import api from './api';

export const register = async (formData) => {
  const response = await api.post('/auth/register', formData);
  return response.data.data.user;
};

export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data.data.user;
};

export const logout = async () => {
  await api.post('/auth/logout');
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data.data.user;
};
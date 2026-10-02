import api from './api';

export const getDepartments = async () => {
  const response = await api.get('/departments');
  return response.data.data.departments;
};
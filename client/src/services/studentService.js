import api from './api';

export const getProfile = async () => (await api.get('/students/me')).data.data.profile;
export const updateProfile = async (form) => (await api.put('/students/me', form)).data.data.profile;
export const getDashboard = async () => (await api.get('/students/me/dashboard')).data.data;
export const getMySkills = async () => (await api.get('/students/me/skills')).data.data.skills;
export const saveSkill = (payload) => api.put('/students/me/skills', payload);
export const removeSkill = (skillId) => api.delete(`/students/me/skills/${skillId}`);
export const getSkillCatalog = async () => (await api.get('/skills')).data.data.skills;

export const uploadResume = async (file) => {
  const formData = new FormData();
  formData.append('resume', file); // must match upload.single('resume') on the server
  // Do not set Content-Type yourself: the browser adds the multipart boundary
  const response = await api.post('/students/me/resume', formData);
  return response.data.data.resumePath;
};

export const downloadResume = async () => {
  const response = await api.get('/students/me/resume', { responseType: 'blob' });
  return response.data;
};
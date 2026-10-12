import api from './api';

export const getSelectionBoard = async (driveId) => (await api.get(`/selections/drive/${driveId}`)).data.data;
export const createRound = async (payload) => (await api.post('/selections', payload)).data.data;
export const createRoundForDrive = async (driveId, payload) =>
  (await api.post(`/selections/drive/${driveId}/rounds`, payload)).data.data;
export const updateRound = (id, payload) => api.put(`/selections/${id}`, payload);
export const recordResult = async (id, payload) => (await api.patch(`/selections/${id}/result`, payload)).data.data;
export const shortlistApplications = async (applicationIds) =>
  (await api.post('/selections/shortlist', { applicationIds })).data.data;

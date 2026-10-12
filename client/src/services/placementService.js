import api from './api';

export const getMyPlacement = async () => (await api.get('/placements/me')).data.data.placement;

export const getPlacementsOverview = async () => (await api.get('/placements')).data.data; // { placements, awaiting }
export const confirmPlacement = async (payload) => (await api.post('/placements', payload)).data.data;
export const markJoined = (id) => api.patch(`/placements/${id}/status`, { status: 'JOINED' });

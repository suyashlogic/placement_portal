import api from './api';

export const getDrives = async () => (await api.get('/drives')).data.data.drives;
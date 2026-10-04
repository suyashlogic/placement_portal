import api from './api';

export const getJobs = async () => (await api.get('/jobs')).data.data.jobs;
export const createJob = async (payload) => (await api.post('/jobs', payload)).data.data.job;
export const updateJob = async (id, payload) => (await api.put(`/jobs/${id}`, payload)).data.data.job;

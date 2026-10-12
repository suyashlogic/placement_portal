import api from './api';

export const getEmailStatus = async () => (await api.get('/admin/email/status')).data.data;
export const sendTestEmail = async () => (await api.post('/admin/email/test')).data;       // { message, data }
export const runReminders = async () => (await api.post('/admin/reminders/run')).data;

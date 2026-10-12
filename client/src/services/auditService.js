import api from './api';

export const getAuditLogs = async (params) => (await api.get('/audit', { params })).data.data; // { logs, total, page, pageSize }
export const getAuditFilterOptions = async () => (await api.get('/audit/filters')).data.data;   // { actions, entityTypes }

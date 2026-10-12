import api from './api';

export const getNotifications = async () => (await api.get('/notifications')).data.data; // { notifications, unreadCount }
export const markRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAllRead = () => api.patch('/notifications/read-all');

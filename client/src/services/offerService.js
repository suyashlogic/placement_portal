import api from './api';

// Students get their own offers, staff get everyone's: the server decides from the session
export const getMyOffers = async () => (await api.get('/offers')).data.data.offers;
export const decideOffer = async (id, decision) => (await api.patch(`/offers/${id}/decision`, { decision })).data.data;

export const getOffers = async (status) =>
  (await api.get('/offers', { params: { status: status || undefined } })).data.data.offers;
export const getOfferCandidates = async () => (await api.get('/offers/candidates')).data.data.candidates;
export const createOffer = async (payload) => (await api.post('/offers', payload)).data.data;
export const updateOffer = (id, payload) => api.put(`/offers/${id}`, payload);
export const expireOffer = (id) => api.patch(`/offers/${id}/expire`);

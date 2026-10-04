import api from './api';

export const getCompanies = async () => (await api.get('/companies')).data.data.companies;
export const createCompany = async (form) => (await api.post('/companies', form)).data.data.company;
export const updateCompany = async (id, form) => (await api.put(`/companies/${id}`, form)).data.data.company;

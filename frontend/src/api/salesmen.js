import apiClient from './client'

export const getSalesmen = () => apiClient.get('/salesmen/')
export const createSalesman = (name) => apiClient.post('/salesmen/', { name })
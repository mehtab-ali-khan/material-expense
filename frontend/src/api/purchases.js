import apiClient from './client'

export const getPurchases = () => apiClient.get('/purchases/')

export const createPurchase = (data) => apiClient.post('/purchases/', data)
import apiClient from './client'

export const getPurchases = (filters = {}) =>
  apiClient.get('/purchases/', { params: filters })

export const createPurchase = (data) => apiClient.post('/purchases/', data)
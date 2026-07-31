import apiClient from './client'

export const getSales = (filters = {}) =>
  apiClient.get('/sales/', { params: filters })

export const createSale = (data) => apiClient.post('/sales/', data)

export const updateSale = (id, data) => apiClient.patch(`/sales/${id}/`, data)
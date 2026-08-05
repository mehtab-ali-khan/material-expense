import apiClient from './client'

export const getSales = (filters = {}) =>
  apiClient.get('/sales/', { params: filters })

export const getSale = (id) => apiClient.get(`/sales/${id}/`)

export const createSale = (data) => apiClient.post('/sales/', data)

export const updateSale = (id, data) => apiClient.patch(`/sales/${id}/`, data)
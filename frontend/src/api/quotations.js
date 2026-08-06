import apiClient from './client'

export const getQuotations = (filters = {}) =>
  apiClient.get('/quotations/', { params: filters })

export const createQuotation = (data) => apiClient.post('/quotations/', data)

export const updateQuotation = (id, data) => apiClient.patch(`/quotations/${id}/`, data)

export const deleteQuotation = (id) => apiClient.delete(`/quotations/${id}/`)

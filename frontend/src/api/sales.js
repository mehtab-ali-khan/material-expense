import apiClient from './client'

export const getSales = () => apiClient.get('/sales/')

export const createSale = (data) => apiClient.post('/sales/', data)
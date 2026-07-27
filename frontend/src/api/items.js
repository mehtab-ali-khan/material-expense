import apiClient from './client'

export const getItems = () => apiClient.get('/items/')
export const createItem = (name) => apiClient.post('/items/', { name })
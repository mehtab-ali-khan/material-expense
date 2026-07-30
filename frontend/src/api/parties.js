import apiClient from './client'

export const getParties = () => apiClient.get('/parties/')
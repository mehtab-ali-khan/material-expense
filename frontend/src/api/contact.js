import apiClient from './client'

export const sendContactMessage = (message) =>
  apiClient.post('/contact/', { message })
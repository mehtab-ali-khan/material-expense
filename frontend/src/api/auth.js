import apiClient from './client'

export const signup = (name, password) =>
  apiClient.post('/signup/', { name, password })

export const login = (name, password) =>
  apiClient.post('/login/', { name, password })
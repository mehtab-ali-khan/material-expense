import apiClient from './client'

export const signup = (name, password, firstName, lastName, phone) =>
  apiClient.post('/signup/', {
    name,
    password,
    first_name: firstName,
    last_name: lastName,
    phone,
  })

export const login = (phone, password) =>
  apiClient.post('/login/', { phone, password })

export const getMe = () => apiClient.get('/me/')
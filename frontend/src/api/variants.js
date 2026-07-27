import apiClient from './client'

export const getVariants = (itemId) =>
  apiClient.get('/variants/', { params: itemId ? { item: itemId } : {} })
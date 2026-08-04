import apiClient from './client'

export const getParties = (type) => {
	const params = type ? { params: { type } } : {}
	return apiClient.get('/parties/', params)
}
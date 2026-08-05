import { useQuery } from '@tanstack/react-query'
import { getItems } from './items'
import { getParties } from './parties'
import { getPurchases } from './purchases'
import { getQuotations } from './quotations'
import { getSale, getSales } from './sales'
import { getSalesmen } from './salesmen'
import { getVariants } from './variants'
import { queryKeys } from './queryKeys'

const unwrap = async (request) => {
  const response = await request
  return response.data
}

export const useItemsQuery = () => useQuery({
  queryKey: queryKeys.items,
  queryFn: () => unwrap(getItems()),
})

export const usePartiesQuery = (type) => useQuery({
  queryKey: queryKeys.parties(type),
  queryFn: () => unwrap(getParties(type)),
})

export const usePurchasesQuery = (filters) => useQuery({
  queryKey: queryKeys.purchases(filters),
  queryFn: () => unwrap(getPurchases(filters)),
})

export const useQuotationsQuery = (filters) => useQuery({
  queryKey: queryKeys.quotations(filters),
  queryFn: () => unwrap(getQuotations(filters)),
})

export const useSaleQuery = (id) => useQuery({
  queryKey: queryKeys.sale(id),
  queryFn: () => unwrap(getSale(id)),
  enabled: !!id,
})

export const useSalesQuery = (filters) => useQuery({
  queryKey: queryKeys.sales(filters),
  queryFn: () => unwrap(getSales(filters)),
})

export const useSalesmenQuery = () => useQuery({
  queryKey: queryKeys.salesmen,
  queryFn: () => unwrap(getSalesmen()),
})

export const useVariantsQuery = (itemId) => useQuery({
  queryKey: queryKeys.variants(itemId),
  queryFn: () => unwrap(getVariants(itemId)),
})

import { useState, useEffect, useCallback } from 'react'
import { Box, Heading, Text, VStack, HStack } from '@chakra-ui/react'
import { getVariants } from '../api/variants'
import { getSalesmen } from '../api/salesmen'
import AppLayout from '../components/AppLayout'
import PageLoader from '../components/PageLoader'
import ToastMessage from '../components/ToastMessage'
import FilterDropdown from '../components/FilterDropdown'

const formatNumber = (value) => {
    const number = Number(value)
    if (!Number.isFinite(number)) return value
    return number.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function StockPage() {
    const [stock, setStock] = useState([])
    const [salesmen, setSalesmen] = useState([])
    const [salesmanFilter, setSalesmanFilter] = useState('')
    const [loading, setLoading] = useState(true)
    const [toast, setToast] = useState('')

    const loadStock = useCallback(async () => {
        setLoading(true)
        try {
            const [salesmenRes, variantsRes] = await Promise.all([
                getSalesmen(),
                getVariants(),
            ])
            setSalesmen(salesmenRes.data)

            const selectedSalesman = salesmenRes.data.find((salesman) => String(salesman.id) === String(salesmanFilter))
            setStock(variantsRes.data.filter((item) => {
                const hasStock = Number(item.current_stock_qty) > 0
                if (!hasStock) return false
                if (!selectedSalesman) return true
                return item.last_purchase_salesman === selectedSalesman.name
            }))
        } catch {
            setToast('Could not load data')
        } finally {
            setLoading(false)
        }
    }, [salesmanFilter])

    useEffect(() => {
        loadStock()
    }, [loadStock])

    return (
        <AppLayout>
            <Box
                px={4}
                pt="calc(16px + env(safe-area-inset-top))"
                pb="calc(88px + env(safe-area-inset-bottom))"
            >
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                    <Heading fontSize="24px" lineHeight="1.1" color="black">
                        Stock
                    </Heading>
                </Box>

                <HStack mb={3} gap={2} align="center" flexWrap="wrap">
                    <FilterDropdown
                        options={salesmen}
                        value={salesmanFilter}
                        onChange={setSalesmanFilter}
                        placeholder="Salesman"
                        label="Salesman"
                    />
                </HStack>

                {loading ? (
                    <PageLoader />
                ) : stock.length === 0 ? (
                    <Box
                        bg="white"
                        border="1px solid"
                        borderColor="gray.200"
                        borderRadius="2xl"
                        px={5}
                        py={8}
                        textAlign="center"
                    >
                        <Text color="black" fontWeight="semibold">Nothing here yet</Text>
                        <Text color="gray.500" fontSize="14px" mt={1}>New entries will appear here.</Text>
                    </Box>
                ) : (
                    <VStack gap={2} align="stretch">
                        {stock.map((item) => (
                            <StockCard key={item.id} item={item} />
                        ))}
                    </VStack>
                )}
            </Box>
            <ToastMessage message={toast} onDone={() => setToast('')} />
        </AppLayout>
    )
}

function StockCard({ item }) {
    return (
        <Box bg="white" border="1px solid" borderColor="gray.100" borderRadius="xl" px={3} py={2.5}>
            <HStack justify="space-between" align="start" gap={3}>
                <Box minW={0}>
                    <Text
                        color="black"
                        fontSize="16px"
                        fontWeight="semibold"
                        lineHeight="1.25"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        whiteSpace="nowrap"
                    >
                        {item.item_name}
                    </Text>
                    <Text fontSize="12px" color="gray.500" lineHeight="1.3">
                        {item.size} · Price {formatNumber(item.price)}
                    </Text>
                </Box>
                <Text color="black" fontSize="17px" fontWeight="bold" lineHeight="1.25" whiteSpace="nowrap" flexShrink={0}>
                    {formatNumber(item.current_stock_qty)}
                </Text>
            </HStack>

            {item.last_purchase_salesman && (
                <Text mt={1.5} fontSize="12px" color="gray.600" lineHeight="1.35">
                    Salesman: {item.last_purchase_salesman}
                </Text>
            )}
        </Box>
    )
}

export default StockPage

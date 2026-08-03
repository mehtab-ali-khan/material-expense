import { useState, useEffect } from 'react'
import { Box, Heading, Text, VStack, HStack } from '@chakra-ui/react'
import { getSales } from '../api/sales'
import AppLayout from '../components/AppLayout'
import PageLoader from '../components/PageLoader'
import ToastMessage from '../components/ToastMessage'

const formatDisplayDate = (date) => {
    if (!date) return ''
    const parsed = new Date(`${date}T00:00:00`)
    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

const formatNumber = (value) => {
    const number = Number(value)
    if (!Number.isFinite(number)) return value
    return number.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function ProfitPage() {
    const [sales, setSales] = useState([])
    const [loading, setLoading] = useState(true)
    const [toast, setToast] = useState('')

    useEffect(() => {
        loadSales()
    }, [])

    const loadSales = async () => {
        setLoading(true)
        try {
            const res = await getSales()
            setSales(res.data)
        } catch {
            setToast('Could not load data')
        } finally {
            setLoading(false)
        }
    }

    const grandTotal = sales.reduce((sum, sale) => sum + Number(sale.profit), 0)

    return (
        <AppLayout>
            <Box
                px={4}
                pt="calc(16px + env(safe-area-inset-top))"
                pb="calc(88px + env(safe-area-inset-bottom))"
            >
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                    <Heading fontSize="24px" lineHeight="1.1" color="black">
                        Profit
                    </Heading>
                </Box>

                <Box
                    mb={3}
                    px={4}
                    py={3}
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="xl"
                    bg="white"
                    color="black"
                >
                    <Text fontSize="12px" color="gray.500" fontWeight="semibold">
                        Total profit
                    </Text>
                    <Text fontSize="22px" color="black" fontWeight="bold" lineHeight="1.2">
                        {formatNumber(grandTotal)}
                    </Text>
                </Box>

                {loading ? (
                    <PageLoader />
                ) : sales.length === 0 ? (
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
                        {[...sales].sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id).map((sale) => (
                            <ProfitCard key={sale.id} sale={sale} />
                        ))}
                    </VStack>
                )}
            </Box>
            <ToastMessage message={toast} onDone={() => setToast('')} />
        </AppLayout>
    )
}

function ProfitCard({ sale }) {
    const items = sale.items || []

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
                        {sale.party_name || 'No company'}
                    </Text>
                    <Text fontSize="12px" color="gray.500" lineHeight="1.3">
                        {formatDisplayDate(sale.date)} · {items.length} item{items.length === 1 ? '' : 's'}
                    </Text>
                </Box>
                <Text
                    color="black"
                    fontSize="17px"
                    fontWeight="bold"
                    lineHeight="1.25"
                    whiteSpace="nowrap"
                    flexShrink={0}
                >
                    {formatNumber(sale.profit)}
                </Text>
            </HStack>

            <VStack mt={3} gap={2} align="stretch">
                {items.map((item) => (
                    <Box key={item.id} bg="gray.50" borderRadius="lg" px={2.5} py={2}>
                        <HStack justify="space-between" align="start" gap={2}>
                            <Box minW={0}>
                                <Text fontSize="14px" color="black" fontWeight="semibold" lineHeight="1.25">
                                    {item.item_name}
                                </Text>
                                <Text fontSize="12px" color="gray.500" lineHeight="1.35">
                                    {item.length} · {item.quantity} qty · sale {formatNumber(item.sale_price)} · cost {formatNumber(item.purchase_price_snapshot)}
                                </Text>
                            </Box>
                            <Text fontSize="14px" color="black" fontWeight="bold" whiteSpace="nowrap">
                                {formatNumber(item.profit)}
                            </Text>
                        </HStack>
                    </Box>
                ))}
            </VStack>

            {sale.salesman_name && (
                <Text mt={2} fontSize="12px" color="gray.600" lineHeight="1.35">
                    Salesman: {sale.salesman_name}
                </Text>
            )}
        </Box>
    )
}

export default ProfitPage

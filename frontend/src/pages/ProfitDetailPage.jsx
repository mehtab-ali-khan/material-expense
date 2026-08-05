import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Heading, Text, VStack, HStack, IconButton, Button } from '@chakra-ui/react'
import { ArrowLeftIcon } from '../components/Icons'
import { getSale } from '../api/sales'
import AppLayout from '../components/AppLayout'
import PageLoader from '../components/PageLoader'
import ToastMessage from '../components/ToastMessage'

const formatDisplayDate = (date) => {
    if (!date) return ''
    const parsed = new Date(`${date}T00:00:00`)
    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatNumber = (value) => {
    const number = Number(value)
    if (!Number.isFinite(number)) return value
    return number.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function ProfitDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [sale, setSale] = useState(null)
    const [loading, setLoading] = useState(true)
    const [toast, setToast] = useState('')

    useEffect(() => {
        loadSale()
    }, [id])

    const loadSale = async () => {
        setLoading(true)
        try {
            const res = await getSale(id)
            setSale(res.data)
        } catch {
            setToast('Could not load sale')
        } finally {
            setLoading(false)
        }
    }

    const items = sale?.items || []

    return (
        <AppLayout>
            <Box
                px={4}
                pt="calc(16px + env(safe-area-inset-top))"
                pb="calc(88px + env(safe-area-inset-bottom))"
            >
                <HStack mb={4} gap={2}>
                    <Button
                        aria-label="Back"
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        px={2}
                    >
                        <ArrowLeftIcon size={20} />
                    </Button>
                    <Heading fontSize="20px" lineHeight="1.1" color="black">
                        Sale details
                    </Heading>
                </HStack>

                {loading ? (
                    <PageLoader />
                ) : !sale ? (
                    <Box textAlign="center" py={8}>
                        <Text color="black" fontWeight="semibold">Not found</Text>
                    </Box>
                ) : (
                    <Box bg="white" border="1px solid" borderColor="gray.100" borderRadius="xl" px={3} py={2.5}>
                        <HStack justify="space-between" align="start" gap={3}>
                            <Box minW={0}>
                                <Text color="black" fontSize="18px" fontWeight="semibold" lineHeight="1.25">
                                    {sale.party_name || 'No company'}
                                </Text>
                                <Text fontSize="12px" color="gray.500" lineHeight="1.3">
                                    {formatDisplayDate(sale.date)} · {items.length} item{items.length === 1 ? '' : 's'}
                                </Text>
                            </Box>
                            <Text color="black" fontSize="18px" fontWeight="bold" whiteSpace="nowrap" flexShrink={0}>
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
                                                {item.size} · {item.quantity} qty · sale {formatNumber(item.sale_price)} · cost {formatNumber(item.cost_price_at_sale)}
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
                )}
            </Box>
            <ToastMessage message={toast} onDone={() => setToast('')} />
        </AppLayout>
    )
}

export default ProfitDetailPage
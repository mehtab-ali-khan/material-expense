import { useState, useEffect } from 'react'
import { Box, Heading, Text, VStack, Button, HStack, Input } from '@chakra-ui/react'
import { getItems } from '../api/items'
import { getSalesmen } from '../api/salesmen'
import { getVariants } from '../api/variants'
import { getPurchases } from '../api/purchases'
import PurchaseForm from '../components/PurchaseForm'
import AppLayout from '../components/AppLayout'
import { PlusIcon, XIcon } from '../components/Icons'
import PageLoader from '../components/PageLoader'
import ToastMessage from '../components/ToastMessage'

const formatDisplayDate = (date) => {
    if (!date) return ''
    const parsed = new Date(`${date}T00:00:00`)
    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

const formatMoney = (value) => {
    const number = Number(value)
    if (!Number.isFinite(number)) return value
    return number.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

const todayLabel = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
})

function PurchasePage() {
    const [items, setItems] = useState([])
    const [salesmen, setSalesmen] = useState([])
    const [lengthOptions, setLengthOptions] = useState([])
    const [measurementOptions, setMeasurementOptions] = useState([])
    const [purchases, setPurchases] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [loading, setLoading] = useState(true)
    const [toast, setToast] = useState('')
    const [dateFilter, setDateFilter] = useState('')

    useEffect(() => {
        loadAll()
    }, [])

    const loadAll = async () => {
        setLoading(true)
        try {
            const [itemsRes, salesmenRes, variantsRes, purchasesRes] = await Promise.all([
                getItems(),
                getSalesmen(),
                getVariants(),
                getPurchases(dateFilter ? { date: dateFilter } : {}),
            ])
            setItems(itemsRes.data)
            setSalesmen(salesmenRes.data)
            setPurchases(purchasesRes.data)

            const uniqueLengths = [...new Set(variantsRes.data.map((v) => v.length))]
            const uniqueMeasurements = [...new Set(variantsRes.data.map((v) => v.measurement))]
            setLengthOptions(uniqueLengths.map((l, i) => ({ id: i, name: l })))
            setMeasurementOptions(uniqueMeasurements.map((m, i) => ({ id: i, name: m })))
        } catch {
            setToast('Could not load data')
        } finally {
            setLoading(false)
        }
    }
    useEffect(() => {
        loadAll()
    }, [dateFilter])

    const handleSaved = () => {
        setShowForm(false)
        setToast('Purchase saved')
        loadAll()
    }

    return (
        <AppLayout hideBottomNav={showForm}>
            <Box
                px={4}
                pt="calc(16px + env(safe-area-inset-top))"
                pb={showForm ? 4 : 'calc(88px + env(safe-area-inset-bottom))'}
            >
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                    <Box>
                        <Heading fontSize="24px" lineHeight="1.1" color="black">
                            {showForm ? 'Add purchase' : 'Purchases'}
                        </Heading>
                    </Box>
                    <Button
                        display={{ base: 'inline-flex', md: 'inline-flex' }}
                        minH="38px"
                        px={4}
                        borderRadius="full"
                        bg={showForm ? 'white' : 'black'}
                        color={showForm ? 'black' : 'white'}
                        border={showForm ? '1px solid' : 'none'}
                        borderColor="gray.200"
                        fontWeight="semibold"
                        fontSize="14px"
                        _hover={{ bg: 'gray.800' }}
                        onClick={() => setShowForm((s) => !s)}
                    >
                        {showForm ? <XIcon /> : <PlusIcon />}
                        {showForm ? 'Cancel' : 'Add New'}
                    </Button>
                </Box>

                {!showForm && (
                    <HStack mb={3} gap={2}>
                        <Input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            bg="white"
                            border="1px solid"
                            borderColor="gray.200"
                            borderRadius="full"
                            fontSize="13px"
                            minH="38px"
                            w="auto"
                            color="black"
                        />
                        {dateFilter && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDateFilter('')}
                                fontSize="13px"
                            >
                                Clear
                            </Button>
                        )}
                    </HStack>
                )}

                {showForm ? (
                    <PurchaseForm
                        items={items}
                        salesmen={salesmen}
                        lengthOptions={lengthOptions}
                        measurementOptions={measurementOptions}
                        onSaved={handleSaved}
                        onCancel={() => setShowForm(false)}
                    />
                ) : loading ? (
                    <PageLoader />
                ) : purchases.length === 0 ? (
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
                        {[...purchases].sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id).map((p) => (
                            <PurchaseCard key={p.id} purchase={p} />
                        ))}
                    </VStack>
                )}
            </Box>
            <ToastMessage message={toast} onDone={() => setToast('')} />
        </AppLayout>
    )
}

function PurchaseCard({ purchase }) {
    const quantity = Number(purchase.quantity)
    const price = Number(purchase.price)
    const total = Number.isFinite(quantity) && Number.isFinite(price)
        ? quantity * price
        : purchase.price

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
                        {purchase.item_name}
                    </Text>
                    <Text fontSize="12px" color="gray.500" lineHeight="1.3">
                        {purchase.length} · {purchase.measurement}
                    </Text>
                </Box>
                <Box textAlign="right" flexShrink={0}>
                    <Text color="black" fontSize="17px" fontWeight="bold" lineHeight="1.25" whiteSpace="nowrap">
                        {formatMoney(total)}
                    </Text>
                </Box>
            </HStack>

            <Text mt={1.5} fontSize="12px" color="gray.600" lineHeight="1.35">
                {purchase.quantity} qty · {formatMoney(purchase.price)} · {formatDisplayDate(purchase.date)}
                {purchase.salesman_name ? ` · ${purchase.salesman_name}` : ''}
            </Text>
        </Box>
    )
}

export default PurchasePage

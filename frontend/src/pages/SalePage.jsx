import { useState, useEffect } from 'react'
import { Box, Heading, Text, VStack, Button, HStack } from '@chakra-ui/react'
import { getItems } from '../api/items'
import { getSalesmen } from '../api/salesmen'
import { getSales } from '../api/sales'
import { getParties } from '../api/parties'
import SaleForm from '../components/SaleForm'
import AppLayout from '../components/AppLayout'
import { PlusIcon, XIcon } from '../components/Icons'
import PageLoader from '../components/PageLoader'
import ToastMessage from '../components/ToastMessage'
import DateFilterBar from '../components/DateFilterBar'
import SearchBar from '../components/SearchBar'

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

function SalePage() {
    const [items, setItems] = useState([])
    const [salesmen, setSalesmen] = useState([])
    const [parties, setParties] = useState([])
    const [sales, setSales] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [editingSale, setEditingSale] = useState(null)
    const [loading, setLoading] = useState(true)
    const [toast, setToast] = useState('')
    const [search, setSearch] = useState('')
    const [searchInput, setSearchInput] = useState('')

    useEffect(() => {
        const timer = setTimeout(() => setSearch(searchInput), 350)
        return () => clearTimeout(timer)
    }, [searchInput])

    const [dateFilter, setDateFilter] = useState()

    const loadAll = async () => {
        setLoading(true)
        try {
            const filters = {}
            if (dateFilter) filters.date = dateFilter
            if (search.trim()) filters.search = search.trim()

            const [itemsRes, salesmenRes, partiesRes, salesRes] = await Promise.all([
                getItems(),
                getSalesmen(),
                getParties('sale'),
                getSales(filters),
            ])
            setItems(itemsRes.data)
            setSalesmen(salesmenRes.data)
            setParties(partiesRes.data)
            setSales(salesRes.data)
        } catch {
            setToast('Could not load data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadAll()
    }, [dateFilter, search])

    const handleSaved = () => {
        setShowForm(false)
        setEditingSale(null)
        setToast(editingSale ? 'Sale updated' : 'Sale saved')
        loadAll()
    }

    const handleCancel = () => {
        setShowForm(false)
        setEditingSale(null)
    }

    const handleCardClick = (sale) => {
        setEditingSale(sale)
        setShowForm(true)
    }

    const handleAddNew = () => {
        if (showForm) {
            handleCancel()
        } else {
            setEditingSale(null)
            setShowForm(true)
        }
    }

    return (
        <AppLayout hideBottomNav={showForm}>
            <Box
                px={4}
                pt="calc(16px + env(safe-area-inset-top))"
                pb={showForm ? 4 : 'calc(88px + env(safe-area-inset-bottom))'}
            >
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                    <Heading fontSize="24px" lineHeight="1.1" color="black">
                        {showForm ? (editingSale ? 'Sale details' : 'Add sale') : 'Sales'}
                    </Heading>
                    <Button
                        display="inline-flex"
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
                        onClick={handleAddNew}
                    >
                        {showForm ? <XIcon /> : <PlusIcon />}
                        {showForm ? 'Close' : 'Add New'}
                    </Button>
                </Box>

                {!showForm && (
                    <HStack mb={3} gap={2} align="center">
                        <DateFilterBar value={dateFilter} onChange={setDateFilter} />
                        <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search item, company or contact" />
                    </HStack>
                )}

                {showForm ? (
                    <SaleForm
                        items={items}
                        salesmen={salesmen}
                        parties={parties}
                        editingSale={editingSale}
                        onSaved={handleSaved}
                        onCancel={handleCancel}
                    />
                ) : loading ? (
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
                        {[...sales].sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id).map((s) => (
                            <SaleCard key={s.id} sale={s} onClick={() => handleCardClick(s)} />
                        ))}
                    </VStack>
                )}
            </Box>
            <ToastMessage message={toast} onDone={() => setToast('')} />
        </AppLayout>
    )
}

function SaleCard({ sale, onClick }) {
    const items = sale.items || []
    const total = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.sale_price) || 0), 0)
    const itemLabel = items.length === 1
        ? `${items[0].item_name} · ${items[0].size}`
        : `${items.length} items`

    return (
        <Box
            as="button"
            type="button"
            onClick={onClick}
            w="100%"
            textAlign="left"
            bg="white"
            border="1px solid"
            borderColor="gray.100"
            borderRadius="xl"
            px={3}
            py={2.5}
        >
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
                        {itemLabel}
                    </Text>
                    <Text fontSize="12px" color="gray.500" lineHeight="1.3">
                        {sale.party_name || 'No company'}
                    </Text>
                </Box>
                <Text color="black" fontSize="17px" fontWeight="bold" lineHeight="1.25" whiteSpace="nowrap" flexShrink={0}>
                    {formatMoney(total)}
                </Text>
            </HStack>

            <Text mt={1.5} fontSize="12px" color="gray.600" lineHeight="1.35">
                {formatMoney(total)} total · {formatDisplayDate(sale.date)}
                {sale.salesman_name ? ` · ${sale.salesman_name}` : ''}
            </Text>
        </Box>
    )
}

export default SalePage

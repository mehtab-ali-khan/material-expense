import { useEffect, useMemo, useState } from 'react'
import { Box, Heading, Tabs, Button, HStack, VStack, Text } from '@chakra-ui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import AppLayout from '../components/AppLayout'
import QuotationForm from '../components/QuotationForm'
import QuotationPreview from '../components/QuotationPreview'
import PageLoader from '../components/PageLoader'
import ToastMessage from '../components/ToastMessage'
import FormMessage from '../components/FormMessage'
import SearchBar from '../components/SearchBar'
import DateFilterBar from '../components/DateFilterBar'
import { downloadQuotationPdf } from '../utils/generateQuotationPdf'
import { useAuth } from '../context/AuthContext'
import { createQuotation } from '../api/quotations'
import { queryKeys } from '../api/queryKeys'
import { usePartiesQuery, useQuotationsQuery } from '../api/queries'
import { PlusIcon, XIcon, SaveIcon, ArrowUpRightIcon } from '../components/Icons'

const emptyItems = () => [{ description: '', qty: '', price: '' }]

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

// 'list' | 'view' | 'edit'
function QuotationPage() {
    const { companyName, profile } = useAuth()
    const queryClient = useQueryClient()

    const [toast, setToast] = useState('')
    const [search, setSearch] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const [dateFilter, setDateFilter] = useState()

    const [mode, setMode] = useState('list')
    const [viewingQuotation, setViewingQuotation] = useState(null)
    const [activeTab, setActiveTab] = useState('form')
    const [error, setError] = useState('')

    const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
    const [items, setItems] = useState(emptyItems())
    const [vatPercent, setVatPercent] = useState('5')
    const [advancePercent, setAdvancePercent] = useState('50')
    const [partyName, setPartyName] = useState('')
    const [partyContact, setPartyContact] = useState('')

    useEffect(() => {
        const timer = setTimeout(() => setSearch(searchInput), 350)
        return () => clearTimeout(timer)
    }, [searchInput])

    const filters = useMemo(() => {
        const nextFilters = {}
        if (dateFilter) nextFilters.date = dateFilter
        if (search.trim()) nextFilters.search = search.trim()
        return nextFilters
    }, [dateFilter, search])

    const quotationsQuery = useQuotationsQuery(filters)
    const partiesQuery = usePartiesQuery('sale')

    const quotations = quotationsQuery.data ?? []
    const parties = partiesQuery.data ?? []
    const loading = quotationsQuery.isLoading || partiesQuery.isLoading
    const hasError = quotationsQuery.isError || partiesQuery.isError

    const createQuotationMutation = useMutation({
        mutationFn: createQuotation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.quotationLists })
            queryClient.invalidateQueries({ queryKey: queryKeys.parties('sale') })
        },
    })

    useEffect(() => {
        if (hasError) {
            setToast('Could not load data')
        }
    }, [hasError])

    const resetForm = () => {
        setDate(new Date().toISOString().slice(0, 10))
        setItems(emptyItems())
        setVatPercent('5')
        setAdvancePercent('50')
        setPartyName('')
        setPartyContact('')
        setError('')
        setActiveTab('form')
    }

    const handleAddNew = () => {
        resetForm()
        setMode('edit')
    }

    const handleCardClick = (quotation) => {
        setViewingQuotation(quotation)
        setMode('view')
    }

    const handleUseThisQuotation = () => {
        const q = viewingQuotation
        setDate(q.date)
        setItems(
            q.items && q.items.length > 0
                ? q.items.map((it) => ({
                    description: it.description,
                    qty: String(it.qty),
                    price: String(it.price),
                }))
                : emptyItems()
        )
        setVatPercent(String(q.vat_percent ?? '0'))
        setAdvancePercent(String(q.advance_percent ?? '0'))
        setPartyName(q.party_name || '')
        setPartyContact(q.party_contact || '')
        setError('')
        setActiveTab('form')
        setMode('edit')
    }

    const handleCancel = () => {
        setMode('list')
        setViewingQuotation(null)
    }

    const validItems = items.filter((it) => it.description.trim() && it.qty && it.price)

    const disabledReason = (() => {
        if (!partyName.trim()) return 'Select company'
        if (!partyContact.trim()) return 'Enter company contact'
        if (!date) return 'Select date'
        if (validItems.length === 0) return 'Add at least one item with description, qty and price'
        return ''
    })()

    const isValid = !disabledReason

    const company = {
        name: companyName,
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone: profile.phone,
    }

    const viewCompany = viewingQuotation
        ? {
            name: companyName,
            first_name: profile.firstName,
            last_name: profile.lastName,
            phone: profile.phone,
        }
        : company

    const handleSaveAndDownload = async () => {
        setError('')
        if (!isValid) {
            setError(disabledReason)
            return
        }

        const payload = {
            party_name: partyName,
            party_contact: partyContact,
            date,
            vat_percent: vatPercent || '0',
            advance_percent: advancePercent || '0',
            items: validItems.map((it) => ({
                description: it.description,
                qty: it.qty,
                price: it.price,
            })),
        }

        try {
            await createQuotationMutation.mutateAsync(payload)
            setToast('Quotation saved')

            downloadQuotationPdf({
                company,
                items: validItems,
                date,
                vatPercent,
                advancePercent,
            })

            setMode('list')
            setViewingQuotation(null)
        } catch {
            setError('Could not save quotation. Please check the values and try again.')
        }
    }

    const headingText =
        mode === 'view' ? 'Quotation' : mode === 'edit' ? 'New quotation' : 'Quotations'

    return (
        <AppLayout hideBottomNav={mode !== 'list'}>
            <Box
                px={4}
                pt="calc(16px + env(safe-area-inset-top))"
                pb={mode !== 'list' ? 4 : 'calc(88px + env(safe-area-inset-bottom))'}
            >
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                    <Heading fontSize="24px" lineHeight="1.1" color="black">
                        {headingText}
                    </Heading>
                    <Button
                        display="inline-flex"
                        minH="38px"
                        px={4}
                        borderRadius="full"
                        bg={mode === 'list' ? 'black' : 'white'}
                        color={mode === 'list' ? 'white' : 'black'}
                        border={mode === 'list' ? 'none' : '1px solid'}
                        borderColor="gray.200"
                        fontWeight="semibold"
                        fontSize="14px"
                        _hover={{ bg: 'gray.800' }}
                        onClick={mode === 'list' ? handleAddNew : handleCancel}
                    >
                        {mode === 'list' ? <PlusIcon /> : <XIcon />}
                        {mode === 'list' ? 'Add New' : 'Cancel'}
                    </Button>
                </Box>

                {mode === 'list' && (
                    <HStack mb={3} gap={2} align="center">
                        <DateFilterBar value={dateFilter} onChange={setDateFilter} />
                        <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search company or contact" />
                    </HStack>
                )}

                {mode === 'view' && viewingQuotation && (
                    <>
                        <QuotationPreview
                            company={viewCompany}
                            date={viewingQuotation.date}
                            items={viewingQuotation.items.map((it) => ({
                                description: it.description,
                                qty: it.qty,
                                price: it.price,
                            }))}
                            vatPercent={viewingQuotation.vat_percent}
                            advancePercent={viewingQuotation.advance_percent}
                        />

                        <HStack justify="center" mt={8}>
                            <Button
                                onClick={handleUseThisQuotation}
                                minH="38px" w="full" borderRadius="full"
                                bg="black" color="white" fontWeight="semibold"
                                _hover={{ bg: 'gray.800' }}
                            >
                                <ArrowUpRightIcon boxSize={4} />
                                Use this quotation
                            </Button>
                        </HStack>
                    </>
                )}

                {mode === 'edit' && (
                    <Tabs.Root value={activeTab} onValueChange={(e) => setActiveTab(e.value)} variant="plain">
                        <Tabs.List mb={4} w="100%" position="relative">
                            <Tabs.Trigger value="form" flex="1" justifyContent="center">
                                Form
                            </Tabs.Trigger>
                            <Tabs.Trigger value="preview" flex="1" justifyContent="center">
                                Preview
                            </Tabs.Trigger>
                            <Tabs.Indicator
                                bg="black"
                                height="2px"
                                bottom="0"
                                transition="all 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
                            />
                        </Tabs.List>

                        <Tabs.Content value="form">
                            <QuotationForm
                                date={date} setDate={setDate}
                                items={items} setItems={setItems}
                                vatPercent={vatPercent} setVatPercent={setVatPercent}
                                advancePercent={advancePercent} setAdvancePercent={setAdvancePercent}
                                parties={parties}
                                partyName={partyName} setPartyName={setPartyName}
                                partyContact={partyContact} setPartyContact={setPartyContact}
                            />

                            {error && <Box mt={3}><FormMessage tone="error">{error}</FormMessage></Box>}

                            <HStack justify="center" mt={8}>
                                <Button
                                    onClick={() => setActiveTab('preview')}
                                    minH="38px" w="full" borderRadius="full"
                                    bg="black" color="white" fontWeight="semibold"
                                    _hover={{ bg: 'gray.800' }}
                                >
                                    <ArrowUpRightIcon boxSize={4} />
                                    Preview
                                </Button>
                            </HStack>
                        </Tabs.Content>

                        <Tabs.Content value="preview">
                            <QuotationPreview
                                company={company}
                                date={date}
                                items={validItems}
                                vatPercent={vatPercent}
                                advancePercent={advancePercent}
                            />

                            {error && <Box mt={3}><FormMessage tone="error">{error}</FormMessage></Box>}

                            <HStack justify="center" mt={8}>
                                <Button
                                    onClick={handleSaveAndDownload}
                                    loading={createQuotationMutation.isPending}
                                    disabled={!isValid}
                                    minH="38px" w="full" borderRadius="full"
                                    bg="black" color="white" fontWeight="semibold"
                                    _hover={{ bg: 'gray.800' }}
                                    _disabled={{ bg: 'gray.300', color: 'gray.600', cursor: 'not-allowed' }}
                                >
                                    <SaveIcon boxSize={4} />
                                    Save & Download
                                </Button>
                            </HStack>
                        </Tabs.Content>
                    </Tabs.Root>
                )}

                {mode === 'list' && (
                    loading ? (
                        <PageLoader />
                    ) : quotations.length === 0 ? (
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
                            {[...quotations]
                                .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id)
                                .map((q) => (
                                    <QuotationCard key={q.id} quotation={q} onClick={() => handleCardClick(q)} />
                                ))}
                        </VStack>
                    )
                )}
            </Box>
            <ToastMessage message={toast} onDone={() => setToast('')} />
        </AppLayout>
    )
}

function QuotationCard({ quotation, onClick }) {
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
            cursor="pointer"
            _hover={{ borderColor: 'gray.300' }}
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
                        {quotation.party_name}
                    </Text>
                    <Text fontSize="12px" color="gray.500" lineHeight="1.3">
                        {quotation.party_contact}
                    </Text>
                </Box>
                <Text color="black" fontSize="17px" fontWeight="bold" lineHeight="1.25" whiteSpace="nowrap" flexShrink={0}>
                    {formatMoney(quotation.grand_total)}
                </Text>
            </HStack>

            <Text mt={1.5} fontSize="12px" color="gray.600" lineHeight="1.35">
                Sub {formatMoney(quotation.sub_total)} · VAT {quotation.vat_percent}% ({formatMoney(quotation.vat_amount)}) · {formatDisplayDate(quotation.date)}
            </Text>
        </Box>
    )
}

export default QuotationPage

import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Heading, Input, Stack, Text, VStack } from '@chakra-ui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import AppLayout from '../components/AppLayout'
import FormMessage from '../components/FormMessage'
import PageLoader from '../components/PageLoader'
import ToastMessage from '../components/ToastMessage'
import { SaveIcon, XIcon } from '../components/Icons'
import { useSalesmenQuery } from '../api/queries'
import { queryKeys } from '../api/queryKeys'
import { updateSalesman } from '../api/salesmen'

const EMPTY_ARRAY = []

const fieldInputStyles = {
    bg: 'white',
    border: '1px solid',
    borderColor: 'gray.300',
    color: 'black',
    _placeholder: { color: 'gray.400' },
    _hover: { borderColor: 'gray.400' },
    _focus: { borderColor: 'black', boxShadow: '0 0 0 1px black' },
    borderRadius: 'xl',
    minH: '54px',
    fontSize: '16px',
}

function SalesmenPage() {
    const queryClient = useQueryClient()
    const salesmenQuery = useSalesmenQuery()
    const salesmen = salesmenQuery.data ?? EMPTY_ARRAY
    const [selectedId, setSelectedId] = useState(null)
    const [showForm, setShowForm] = useState(false)
    const [name, setName] = useState('')
    const [salary, setSalary] = useState('')
    const [contact, setContact] = useState('')
    const [error, setError] = useState('')
    const [toast, setToast] = useState('')

    const selectedSalesman = useMemo(
        () => salesmen.find((salesman) => String(salesman.id) === String(selectedId)) || null,
        [salesmen, selectedId],
    )

    useEffect(() => {
        if (!selectedSalesman) return
        setName(selectedSalesman.name || '')
        setSalary(selectedSalesman.salary ? String(selectedSalesman.salary) : '')
        setContact(selectedSalesman.contact || '')
        setError('')
    }, [selectedSalesman])

    useEffect(() => {
        if (salesmenQuery.isError) {
            setToast('Could not load salesmen')
        }
    }, [salesmenQuery.isError])

    const updateSalesmanMutation = useMutation({
        mutationFn: ({ id, payload }) => updateSalesman(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.salesmen })
            setShowForm(false)
            setSelectedId(null)
            setToast('Salesman updated')
        },
        onError: (err) => {
            const data = err.response?.data
            const detail = data?.name?.[0] || data?.salary?.[0] || data?.contact?.[0] || data?.detail
            setError(detail || 'Could not save salesman. Please check the values and try again.')
        },
    })

    const closeForm = () => {
        setShowForm(false)
        setSelectedId(null)
        setError('')
    }

    const handleCardClick = (salesman) => {
        setSelectedId(salesman.id)
        setShowForm(true)
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!selectedSalesman) return
        setError('')

        if (!name.trim()) {
            setError('Name is required.')
            return
        }

        updateSalesmanMutation.mutate({
            id: selectedSalesman.id,
            payload: {
                name: name.trim(),
                salary: salary.trim() || '0',
                contact: contact.trim(),
            },
        })
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
                        {showForm ? 'Salesman details' : 'Salesmen'}
                    </Heading>
                    {showForm && (
                        <Button
                            display="inline-flex"
                            minH="38px"
                            px={4}
                            borderRadius="full"
                            bg="white"
                            color="black"
                            border="1px solid"
                            borderColor="gray.200"
                            fontWeight="semibold"
                            fontSize="14px"
                            _hover={{ bg: 'gray.50' }}
                            onClick={closeForm}
                        >
                            <XIcon />
                            Close
                        </Button>
                    )}
                </Box>

                {showForm && selectedSalesman ? (
                    <form onSubmit={handleSubmit} noValidate>
                        <VStack
                            gap={3}
                            align="stretch"
                            pb="calc(88px + env(safe-area-inset-bottom))"
                        >
                            <Field label="Name">
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    enterKeyHint="next"
                                    {...fieldInputStyles}
                                />
                            </Field>

                            <Field label="Salary">
                                <Input
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    step="0.01"
                                    value={salary}
                                    onChange={(e) => setSalary(e.target.value)}
                                    enterKeyHint="next"
                                    {...fieldInputStyles}
                                />
                            </Field>

                            <Field label="Contact">
                                <Input
                                    type="tel"
                                    inputMode="tel"
                                    value={contact}
                                    onChange={(e) => setContact(e.target.value)}
                                    enterKeyHint="done"
                                    {...fieldInputStyles}
                                />
                            </Field>

                            {error && <FormMessage tone="error">{error}</FormMessage>}

                            <Button
                                type="submit"
                                loading={updateSalesmanMutation.isPending}
                                disabled={updateSalesmanMutation.isPending}
                                size="sm"
                                h="38px"
                                borderRadius="full"
                                bg="black"
                                color="white"
                                fontWeight="semibold"
                                fontSize="14px"
                                _hover={{ bg: 'gray.800' }}
                                _disabled={{ bg: 'gray.300', color: 'gray.500', cursor: 'not-allowed' }}
                                mt={1}
                            >
                                <SaveIcon boxSize={4} />
                                Save
                            </Button>
                        </VStack>
                    </form>
                ) : salesmenQuery.isLoading ? (
                    <PageLoader />
                ) : salesmen.length === 0 ? (
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
                        <Text color="gray.500" fontSize="14px" mt={1}>Salesmen will appear after purchase or sale entries.</Text>
                    </Box>
                ) : (
                    <VStack gap={2} align="stretch">
                        {salesmen.map((salesman) => (
                            <SalesmanCard
                                key={salesman.id}
                                salesman={salesman}
                                active={String(salesman.id) === String(selectedId)}
                                onClick={() => handleCardClick(salesman)}
                            />
                        ))}
                    </VStack>
                )}
            </Box>

            <ToastMessage message={toast} onDone={() => setToast('')} />
        </AppLayout>
    )
}

function SalesmanCard({ salesman, active, onClick }) {
    return (
        <Box
            as="button"
            type="button"
            textAlign="left"
            bg="white"
            border="1px solid"
            borderColor={active ? 'black' : 'gray.100'}
            borderRadius="xl"
            px={3}
            py={3}
            w="full"
            _hover={{ borderColor: 'gray.300' }}
            onClick={onClick}
        >
            <Text
                color="black"
                fontSize="16px"
                // fontWeight="semibold"
                lineHeight="1.25"
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
            >
                {salesman.name}
            </Text>
        </Box>
    )
}

function Field({ label, children }) {
    return (
        <Stack gap={1.5}>
            <Text fontSize="14px" fontWeight="semibold" color="gray.700">
                {label}
            </Text>
            {children}
        </Stack>
    )
}

export default SalesmenPage

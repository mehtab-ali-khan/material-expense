import { useState, useEffect } from 'react'
import { Box, Heading, Text, VStack, Button, SimpleGrid, Table } from '@chakra-ui/react'
import { getItems } from '../api/items'
import { getSalesmen } from '../api/salesmen'
import { getVariants } from '../api/variants'
import { getPurchases } from '../api/purchases'
import PurchaseForm from '../components/PurchaseForm'
import AppLayout from '../components/AppLayout'

function PurchasePage() {
    const [items, setItems] = useState([])
    const [salesmen, setSalesmen] = useState([])
    const [lengthOptions, setLengthOptions] = useState([])
    const [measurementOptions, setMeasurementOptions] = useState([])
    const [purchases, setPurchases] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadAll()
    }, [])

    const loadAll = async () => {
        setLoading(true)
        const [itemsRes, salesmenRes, variantsRes, purchasesRes] = await Promise.all([
            getItems(),
            getSalesmen(),
            getVariants(),
            getPurchases(),
        ])
        setItems(itemsRes.data)
        setSalesmen(salesmenRes.data)
        setPurchases(purchasesRes.data)

        const uniqueLengths = [...new Set(variantsRes.data.map((v) => v.length))]
        const uniqueMeasurements = [...new Set(variantsRes.data.map((v) => v.measurement))]
        setLengthOptions(uniqueLengths.map((l, i) => ({ id: i, name: l })))
        setMeasurementOptions(uniqueMeasurements.map((m, i) => ({ id: i, name: m })))
        setLoading(false)
    }

    const handleSaved = () => {
        setShowForm(false)
        loadAll()
    }

    return (
        <AppLayout>
            <Box maxW="3xl" mx="auto" p={{ base: 4, sm: 6 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
                    <Heading size="lg" color="black">Purchases</Heading>
                    <Button
                        size="sm"
                        borderRadius="lg"
                        bg="black"
                        color="white"
                        fontWeight="semibold"
                        _hover={{ bg: 'gray.800' }}
                        onClick={() => setShowForm((s) => !s)}
                    >
                        {showForm ? 'Cancel' : '+ Add New'}
                    </Button>
                </Box>

                {showForm && (
                    <Box maxW="lg">
                        <PurchaseForm
                            items={items}
                            salesmen={salesmen}
                            lengthOptions={lengthOptions}
                            measurementOptions={measurementOptions}
                            onSaved={handleSaved}
                        />
                    </Box>
                )}

                {loading ? (
                    <Text color="gray.500">Loading...</Text>
                ) : purchases.length === 0 ? (
                    <Text color="gray.500">No purchases recorded yet.</Text>
                ) : (
                    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="xl" overflow="hidden">
                        {/* Desktop table */}
                        <Box display={{ base: 'none', md: 'block' }} overflowX="auto">
                            <Table.Root size="md">
                                <Table.Header>
                                    <Table.Row bg="gray.50">
                                        <Table.ColumnHeader>Item</Table.ColumnHeader>
                                        <Table.ColumnHeader>Length</Table.ColumnHeader>
                                        <Table.ColumnHeader>Measurement</Table.ColumnHeader>
                                        <Table.ColumnHeader>Salesman</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign="end">Qty</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign="end">Price</Table.ColumnHeader>
                                        <Table.ColumnHeader>Date</Table.ColumnHeader>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {purchases.map((p) => (
                                        <Table.Row key={p.id}>
                                            <Table.Cell color="black">{p.item_name}</Table.Cell>
                                            <Table.Cell color="gray.700">{p.length}</Table.Cell>
                                            <Table.Cell color="gray.700">{p.measurement}</Table.Cell>
                                            <Table.Cell color="gray.700">{p.salesman_name}</Table.Cell>
                                            <Table.Cell textAlign="end" color="black">{p.quantity}</Table.Cell>
                                            <Table.Cell textAlign="end" color="black">{p.price}</Table.Cell>
                                            <Table.Cell color="gray.500">{p.date}</Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table.Root>
                        </Box>

                        {/* Mobile card list */}
                        <VStack display={{ base: 'flex', md: 'none' }} gap={0} align="stretch">
                            {purchases.map((p) => (
                                <Box key={p.id} px={4} py={3} borderBottom="1px solid" borderColor="gray.100">
                                    <Box display="flex" justifyContent="space-between" alignItems="start">
                                        <Box>
                                            <Text color="black">{p.item_name}</Text>
                                            <Text fontSize="sm" color="gray.500">{p.length} · {p.measurement}</Text>
                                        </Box>
                                        <Text color="black">Rs. {p.price}/unit</Text>
                                    </Box>
                                    <SimpleGrid columns={3} gap={2} mt={3} bg="gray.50" borderRadius="lg" p={2}>
                                        <VStack gap={0} align="center">
                                            <Text fontSize="xs" color="gray.500">Qty</Text>
                                            <Text fontSize="sm" fontWeight="medium" color="black">{p.quantity}</Text>
                                        </VStack>
                                        <VStack gap={0} align="center">
                                            <Text fontSize="xs" color="gray.500">Salesman</Text>
                                            <Text fontSize="sm" fontWeight="medium" color="black">{p.salesman_name}</Text>
                                        </VStack>
                                        <VStack gap={0} align="center">
                                            <Text fontSize="xs" color="gray.500">Date</Text>
                                            <Text fontSize="sm" fontWeight="medium" color="black">{p.date}</Text>
                                        </VStack>
                                    </SimpleGrid>
                                </Box>
                            ))}
                        </VStack>
                    </Box>
                )}
            </Box>
        </AppLayout>
    )
}

export default PurchasePage
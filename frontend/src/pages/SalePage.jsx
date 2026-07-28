import { useState, useEffect } from 'react'
import { Box, Heading, Text, VStack, Button, SimpleGrid, Table } from '@chakra-ui/react'
import { getItems } from '../api/items'
import { getSalesmen } from '../api/salesmen'
import { getSales } from '../api/sales'
import SaleForm from '../components/SaleForm'
import AppLayout from '../components/AppLayout'

function SalePage() {
    const [items, setItems] = useState([])
    const [salesmen, setSalesmen] = useState([])
    const [sales, setSales] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadAll()
    }, [])

    const loadAll = async () => {
        setLoading(true)
        const [itemsRes, salesmenRes, salesRes] = await Promise.all([
            getItems(),
            getSalesmen(),
            getSales(),
        ])
        setItems(itemsRes.data)
        setSalesmen(salesmenRes.data)
        setSales(salesRes.data)
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
                    <Heading size="lg" color="black">Sales</Heading>
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
                        <SaleForm items={items} salesmen={salesmen} onSaved={handleSaved} />
                    </Box>
                )}

                {loading ? (
                    <Text color="gray.500">Loading...</Text>
                ) : sales.length === 0 ? (
                    <Text color="gray.500">No sales recorded yet.</Text>
                ) : (
                    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="xl" overflow="hidden">
                        {/* Desktop table */}
                        <Box display={{ base: 'none', md: 'block' }} overflowX="auto">
                            <Table.Root size="md">
                                <Table.Header>
                                    <Table.Row bg="gray.50">
                                        <Table.ColumnHeader>Item</Table.ColumnHeader>
                                        <Table.ColumnHeader>Variant</Table.ColumnHeader>
                                        <Table.ColumnHeader>Salesman</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign="end">Qty</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign="end">Cost</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign="end">Sale Price</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign="end">Profit</Table.ColumnHeader>
                                        <Table.ColumnHeader>Date</Table.ColumnHeader>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {sales.map((s) => (
                                        <Table.Row key={s.id}>
                                            <Table.Cell color="black">{s.item_name}</Table.Cell>
                                            <Table.Cell color="gray.700">{s.length} · {s.measurement}</Table.Cell>
                                            <Table.Cell color="gray.700">{s.salesman_name}</Table.Cell>
                                            <Table.Cell textAlign="end" color="gray.700">{s.quantity}</Table.Cell>
                                            <Table.Cell textAlign="end" color="gray.700">{s.purchase_price_snapshot}</Table.Cell>
                                            <Table.Cell textAlign="end" color="gray.700">{s.sale_price}</Table.Cell>
                                            <Table.Cell textAlign="end" color="black">{s.profit}</Table.Cell>
                                            <Table.Cell color="gray.500">{s.date}</Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table.Root>
                        </Box>

                        {/* Mobile card list */}
                        <VStack display={{ base: 'flex', md: 'none' }} gap={0} align="stretch">
                            {sales.map((s) => (
                                <Box key={s.id} px={4} py={3} borderBottom="1px solid" borderColor="gray.100">
                                    <Box display="flex" justifyContent="space-between" alignItems="start">
                                        <Box>
                                            <Text color="black">{s.item_name}</Text>
                                            <Text fontSize="sm" color="gray.500">{s.length} · {s.measurement}</Text>
                                        </Box>
                                        <VStack gap={0} align="end">
                                            <Text fontSize="xs" color="gray.500">Profit</Text>
                                            <Text fontSize="lg" color="black">{s.profit}</Text>
                                        </VStack>
                                    </Box>
                                    <SimpleGrid columns={3} gap={2} mt={3} bg="gray.50" borderRadius="lg" p={2}>
                                        <VStack gap={0} align="center">
                                            <Text fontSize="xs" color="gray.500">Cost</Text>
                                            <Text fontSize="sm" fontWeight="medium" color="black">{s.purchase_price_snapshot}</Text>
                                        </VStack>
                                        <VStack gap={0} align="center">
                                            <Text fontSize="xs" color="gray.500">Sale Price</Text>
                                            <Text fontSize="sm" fontWeight="medium" color="black">{s.sale_price}</Text>
                                        </VStack>
                                        <VStack gap={0} align="center">
                                            <Text fontSize="xs" color="gray.500">Qty</Text>
                                            <Text fontSize="sm" fontWeight="medium" color="black">{s.quantity}</Text>
                                        </VStack>
                                    </SimpleGrid>
                                    <Box display="flex" justifyContent="space-between" mt={2}>
                                        <Text fontSize="xs" color="gray.500">{s.salesman_name}</Text>
                                        <Text fontSize="xs" color="gray.500">{s.date}</Text>
                                    </Box>
                                </Box>
                            ))}
                        </VStack>
                    </Box>
                )}
            </Box>
        </AppLayout>
    )
}

export default SalePage
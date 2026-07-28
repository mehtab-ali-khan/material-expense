import { useState, useEffect } from 'react'
import { Box, Heading, Text, VStack, Button, SimpleGrid } from '@chakra-ui/react'
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
            <Box maxW="lg" mx="auto" p={{ base: 4, sm: 6 }}>
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
                    <SaleForm items={items} salesmen={salesmen} onSaved={handleSaved} />
                )}

                {loading ? (
                    <Text color="gray.500">Loading...</Text>
                ) : sales.length === 0 ? (
                    <Text color="gray.500">No sales recorded yet.</Text>
                ) : (
                    <VStack gap={0} align="stretch" bg="white" border="1px solid" borderColor="gray.200" borderRadius="xl" overflow="hidden">
                        {sales.map((s) => (
                            <Box key={s.id} px={4} py={3} borderBottom="1px solid" borderColor="gray.100">
                                <Box display="flex" justifyContent="space-between" alignItems="start">
                                    <Box>
                                        <Text color="black">{s.item_name}</Text>
                                        <Text fontSize="sm" color="gray.500">{s.length} · {s.measurement}</Text>
                                    </Box>
                                    <VStack gap={0} align="end">
                                        <Text fontSize="xs" color="gray.500">Profit</Text>
                                        <Text fontWeight="bold" fontSize="lg" color="black">{s.profit}</Text>
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
                )}
            </Box>
        </AppLayout>
    )
}

export default SalePage
import { useState, useEffect } from 'react'
import { Box, Heading, Table, Text, VStack, SimpleGrid } from '@chakra-ui/react'
import { getSales } from '../api/sales'
import AppLayout from '../components/AppLayout'

function ProfitPage() {
    const [sales, setSales] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadSales()
    }, [])

    const loadSales = async () => {
        setLoading(true)
        const res = await getSales()
        setSales(res.data)
        setLoading(false)
    }

    const grandTotal = sales.reduce((sum, s) => sum + Number(s.profit), 0)

    return (
        <AppLayout>
            <Box maxW="3xl" mx="auto" p={{ base: 4, sm: 6 }}>
                <Heading size="lg" color="black" mb={2}>
                    Profit
                </Heading>

                <Box
                    bg="white"
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="xl"
                    px={5}
                    py={4}
                    mb={6}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                >
                    <VStack align="start" gap={0}>
                        <Text fontSize="xs" color="gray.500" fontWeight="medium" textTransform="uppercase" letterSpacing="wide">
                            Total Profit
                        </Text>
                        <Text fontSize="2xl" color="black">
                            {grandTotal.toFixed(2)}
                        </Text>
                    </VStack>

                </Box>

                {loading ? (
                    <Text color="gray.500">Loading...</Text>
                ) : sales.length === 0 ? (
                    <Text color="gray.500">No sales recorded yet.</Text>
                ) : (
                    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="xl" overflow="hidden">
                        {/* Desktop / wide table */}
                        <Box display={{ base: 'none', md: 'block' }}>
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
                                            <Table.Cell fontWeight="medium" color="black">{s.item_name}</Table.Cell>
                                            <Table.Cell color="gray.700">{s.length} · {s.measurement}</Table.Cell>
                                            <Table.Cell color="gray.700">{s.salesman_display}</Table.Cell>
                                            <Table.Cell textAlign="end" color="gray.700">{s.quantity}</Table.Cell>
                                            <Table.Cell textAlign="end" color="gray.700">{s.purchase_price_snapshot}</Table.Cell>
                                            <Table.Cell textAlign="end" color="gray.700">{s.sale_price}</Table.Cell>
                                            <Table.Cell textAlign="end" color={Number(s.profit) >= 0 ? 'black' : 'red.600'}>
                                                {s.profit}
                                            </Table.Cell>
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
                                            <Text fontSize="sm" color="gray.500">
                                                {s.length} · {s.measurement}
                                            </Text>
                                        </Box>
                                        <VStack gap={0} align="end">
                                            <Text fontSize="xs" color="gray.500">Profit</Text>
                                            <Text fontSize="lg" color="black">
                                                {s.profit}
                                            </Text>
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
                                        <Text fontSize="xs" color="gray.500">{s.salesman_display}</Text>
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

export default ProfitPage
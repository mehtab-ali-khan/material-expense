import { useState, useEffect } from 'react'
import { Box, Heading, Input, Table, Text, VStack } from '@chakra-ui/react'
import { getVariants } from '../api/variants'
import AppLayout from '../components/AppLayout'

function StockPage() {
    const [variants, setVariants] = useState([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadStock()
    }, [])

    const loadStock = async () => {
        setLoading(true)
        const res = await getVariants()
        setVariants(res.data)
        setLoading(false)
    }

    const filtered = variants.filter((v) =>
        v.item_name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <AppLayout>
            <Box maxW="3xl" mx="auto" p={{ base: 4, sm: 6 }}>
                <Heading size="lg" color="black" mb={6}>
                    Stock
                </Heading>

                <Input
                    placeholder="Search by item name"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    bg="white"
                    border="1px solid"
                    borderColor="gray.300"
                    color="black"
                    _placeholder={{ color: 'gray.400' }}
                    _focus={{ borderColor: 'black', boxShadow: '0 0 0 1px black' }}
                    size="lg"
                    borderRadius="lg"
                    mb={5}
                />

                {loading ? (
                    <Text color="gray.500">Loading...</Text>
                ) : filtered.length === 0 ? (
                    <Text color="gray.500">No stock found.</Text>
                ) : (
                    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="xl" overflow="hidden">
                        {/* Desktop / wide table */}
                        <Box display={{ base: 'none', md: 'block' }}>
                            <Table.Root size="md">
                                <Table.Header>
                                    <Table.Row bg="gray.50">
                                        <Table.ColumnHeader>Item</Table.ColumnHeader>
                                        <Table.ColumnHeader>Length</Table.ColumnHeader>
                                        <Table.ColumnHeader>Measurement</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign="end">Qty</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign="end">Avg Price</Table.ColumnHeader>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {filtered.map((v) => (
                                        <Table.Row key={v.id}>
                                            <Table.Cell fontWeight="medium" color="black">{v.item_name}</Table.Cell>
                                            <Table.Cell color="gray.700">{v.length}</Table.Cell>
                                            <Table.Cell color="gray.700">{v.measurement}</Table.Cell>
                                            <Table.Cell textAlign="end" color="black">{v.current_stock_qty}</Table.Cell>
                                            <Table.Cell textAlign="end" color="gray.700">{v.avg_purchase_price}</Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table.Root>
                        </Box>

                        {/* Mobile card list */}
                        <VStack display={{ base: 'flex', md: 'none' }} gap={0} align="stretch">
                            {filtered.map((v) => (
                                <Box key={v.id} px={4} py={3} borderBottom="1px solid" borderColor="gray.100">
                                    <Text fontWeight="semibold" color="black">{v.item_name}</Text>
                                    <Text fontSize="sm" color="gray.500">
                                        {v.length} · {v.measurement}
                                    </Text>
                                    <Box display="flex" justifyContent="space-between" mt={1}>
                                        <Text fontSize="sm" color="gray.700">Qty: {v.current_stock_qty}</Text>
                                        <Text fontSize="sm" color="gray.700">Avg: {v.avg_purchase_price}</Text>
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

export default StockPage
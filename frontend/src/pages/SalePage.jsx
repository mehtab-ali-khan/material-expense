import { useState, useEffect } from 'react'
import { Box, Button, Heading, Input, Stack, Text, SimpleGrid, VStack, Badge } from '@chakra-ui/react'
import { getItems } from '../api/items'
import { getSalesmen } from '../api/salesmen'
import { getVariants } from '../api/variants'
import { createSale } from '../api/sales'
import SearchableDropdown from '../components/SearchableDropdown'
import SelectDropdown from '../components/SelectDropdown'
import AppLayout from '../components/AppLayout'

const fieldInputStyles = {
    bg: 'white',
    border: '1px solid',
    borderColor: 'gray.300',
    color: 'black',
    _placeholder: { color: 'gray.400' },
    _hover: { borderColor: 'gray.400' },
    _focus: { borderColor: 'black', boxShadow: '0 0 0 1px black' },
    size: 'lg',
    borderRadius: 'lg',
}

function SalePage() {
    const [items, setItems] = useState([])
    const [salesmen, setSalesmen] = useState([])
    const [variants, setVariants] = useState([]) // all variants for the selected item

    const [selectedItem, setSelectedItem] = useState(null)
    const [selectedLength, setSelectedLength] = useState(null)
    const [selectedMeasurement, setSelectedMeasurement] = useState(null)
    const [selectedVariant, setSelectedVariant] = useState(null)

    const [salesmanName, setSalesmanName] = useState('')
    const [quantity, setQuantity] = useState('')
    const [salePrice, setSalePrice] = useState('')
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        loadBaseData()
    }, [])

    const loadBaseData = async () => {
        const [itemsRes, salesmenRes] = await Promise.all([getItems(), getSalesmen()])
        setItems(itemsRes.data)
        setSalesmen(salesmenRes.data)
    }

    const handleItemSelect = async (opt) => {
        setSelectedItem(opt)
        setSelectedLength(null)
        setSelectedMeasurement(null)
        setSelectedVariant(null)
        const res = await getVariants(opt.id)
        setVariants(res.data)
    }

    // Length options: unique lengths available for the selected item
    const lengthOptions = [...new Set(variants.map((v) => v.length))].map((l, i) => ({ id: i, name: l }))

    const handleLengthSelect = (opt) => {
        setSelectedLength(opt.name)
        setSelectedMeasurement(null)
        setSelectedVariant(null)
    }

    // Measurement options: unique measurements available for selected item + length
    const measurementOptions = [...new Set(
        variants.filter((v) => v.length === selectedLength).map((v) => v.measurement)
    )].map((m, i) => ({ id: i, name: m }))

    const handleMeasurementSelect = (opt) => {
        setSelectedMeasurement(opt.name)
        const variant = variants.find((v) => v.length === selectedLength && v.measurement === opt.name)
        setSelectedVariant(variant || null)
    }

    const resetForm = () => {
        setSelectedItem(null)
        setSelectedLength(null)
        setSelectedMeasurement(null)
        setSelectedVariant(null)
        setVariants([])
        setSalesmanName('')
        setQuantity('')
        setSalePrice('')
        setDate(new Date().toISOString().slice(0, 10))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        if (!selectedVariant || !salesmanName || !quantity || !salePrice || !date) {
            setError('Please select item, length, measurement, and fill in all fields.')
            return
        }

        if (Number(quantity) > Number(selectedVariant.current_stock_qty)) {
            setError(`Only ${selectedVariant.current_stock_qty} in stock for this item.`)
            return
        }

        setLoading(true)
        try {
            await createSale({
                variant: selectedVariant.id,
                salesman_name: salesmanName,
                quantity,
                sale_price: salePrice,
                date,
            })
            setSuccess('Sale recorded successfully.')
            resetForm()
        } catch (err) {
            const detail = err.response?.data?.[0] || err.response?.data?.non_field_errors?.[0]
            setError(detail || 'Could not save sale. Please check the values and try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <AppLayout>
            <Box maxW="lg" mx="auto" p={{ base: 4, sm: 6 }}>
                <Heading size="lg" color="black" mb={6}>
                    New Sale
                </Heading>

                <form onSubmit={handleSubmit}>
                    <VStack gap={4} align="stretch">
                        <Field label="Item Name">
                            <SelectDropdown
                                options={items}
                                value={selectedItem?.name || ''}
                                onSelect={handleItemSelect}
                                placeholder="Choose item to sell"
                            />
                        </Field>

                        <SimpleGrid columns={2} gap={4}>
                            <Field label="Length">
                                <SelectDropdown
                                    options={lengthOptions}
                                    value={selectedLength || ''}
                                    onSelect={handleLengthSelect}
                                    placeholder="Choose length"
                                    disabled={!selectedItem}
                                />
                            </Field>
                            <Field label="Measurement">
                                <SelectDropdown
                                    options={measurementOptions}
                                    value={selectedMeasurement || ''}
                                    onSelect={handleMeasurementSelect}
                                    placeholder="Choose measurement"
                                    disabled={!selectedLength}
                                />
                            </Field>
                        </SimpleGrid>

                        {selectedItem && variants.length === 0 && (
                            <Text fontSize="sm" color="gray.500">No stock available for this item.</Text>
                        )}

                        {selectedVariant && (
                            <Box display="flex" gap={2}>
                                <Badge bg="gray.100" color="black" px={3} py={1} borderRadius="full" fontSize="xs">
                                    In stock: {selectedVariant.current_stock_qty}
                                </Badge>
                                <Badge bg="gray.100" color="black" px={3} py={1} borderRadius="full" fontSize="xs">
                                    Avg price: {selectedVariant.avg_purchase_price}
                                </Badge>
                            </Box>
                        )}

                        <Field label="Salesman">
                            <SearchableDropdown
                                options={salesmen}
                                value={salesmanName}
                                onChange={setSalesmanName}
                                onSelect={(opt) => setSalesmanName(opt.name)}
                                onCreate={(text) => setSalesmanName(text)}
                                placeholder="e.g. Ali"
                            />
                        </Field>

                        <SimpleGrid columns={2} gap={4}>
                            <Field label="Quantity">
                                <Input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder="0"
                                    {...fieldInputStyles}
                                />
                            </Field>
                            <Field label="Sale Price (per unit)">
                                <Input
                                    type="number"
                                    value={salePrice}
                                    onChange={(e) => setSalePrice(e.target.value)}
                                    placeholder="0"
                                    {...fieldInputStyles}
                                />
                            </Field>
                        </SimpleGrid>

                        <Field label="Date">
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                {...fieldInputStyles}
                            />
                        </Field>

                        {error && (
                            <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="lg" px={3} py={2}>
                                <Text color="red.600" fontSize="sm">{error}</Text>
                            </Box>
                        )}
                        {success && (
                            <Box bg="green.50" border="1px solid" borderColor="green.200" borderRadius="lg" px={3} py={2}>
                                <Text color="green.700" fontSize="sm">{success}</Text>
                            </Box>
                        )}

                        <Button
                            type="submit"
                            loading={loading}
                            size="lg"
                            borderRadius="lg"
                            bg="black"
                            color="white"
                            fontWeight="semibold"
                            _hover={{ bg: 'gray.800' }}
                            mt={2}
                        >
                            Save Sale
                        </Button>
                    </VStack>
                </form>
            </Box>
        </AppLayout>
    )
}

function Field({ label, children }) {
    return (
        <Stack gap={1.5}>
            <Text fontSize="sm" fontWeight="medium" color="gray.700">
                {label}
            </Text>
            {children}
        </Stack>
    )
}

export default SalePage
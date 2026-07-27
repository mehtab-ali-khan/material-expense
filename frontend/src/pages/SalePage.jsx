import { useState, useEffect } from 'react'
import { Box, Button, Heading, Input, Stack, Text, SimpleGrid, VStack, Badge } from '@chakra-ui/react'
import { getItems } from '../api/items'
import { getSalesmen } from '../api/salesmen'
import { getVariants } from '../api/variants'
import { createSale } from '../api/sales'
import SearchableDropdown from '../components/SearchableDropdown'
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

    const [itemText, setItemText] = useState('')
    const [selectedItem, setSelectedItem] = useState(null)
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
        setItemText(opt.name)
        setSelectedItem(opt)
        setSelectedVariant(null)
        const res = await getVariants(opt.id)
        setVariants(res.data)
    }

    const handleItemTextChange = (val) => {
        setItemText(val)
        setSelectedItem(null)
        setSelectedVariant(null)
        setVariants([])
    }

    // Options for the variant dropdown, labeled clearly for the user to pick from
    const variantOptions = variants.map((v) => ({
        id: v.id,
        name: `${v.length} · ${v.measurement} — stock: ${v.current_stock_qty}`,
    }))

    const handleVariantSelect = (opt) => {
        const variant = variants.find((v) => v.id === opt.id)
        setSelectedVariant(variant)
    }

    const resetForm = () => {
        setItemText('')
        setSelectedItem(null)
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
            setError('Please select an item variant and fill in all fields.')
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
                            <SearchableDropdown
                                options={items}
                                value={itemText}
                                onChange={handleItemTextChange}
                                onSelect={handleItemSelect}
                                onCreate={() => { }} // sale page: items must already exist, no create
                                placeholder="Search item to sell"
                            />
                        </Field>

                        {selectedItem && (
                            <Field label="Variant (length · measurement)">
                                {variantOptions.length > 0 ? (
                                    <SearchableDropdown
                                        options={variantOptions}
                                        value={selectedVariant ? variantOptions.find((o) => o.id === selectedVariant.id)?.name : ''}
                                        onChange={() => { }}
                                        onSelect={handleVariantSelect}
                                        onCreate={() => { }} // variants can't be created from sale page
                                        placeholder="Select length/measurement"
                                    />
                                ) : (
                                    <Text fontSize="sm" color="gray.500">No stock available for this item.</Text>
                                )}
                            </Field>
                        )}

                        {selectedVariant && (
                            <Badge alignSelf="start" bg="gray.100" color="black" px={3} py={1} borderRadius="full">
                                In stock: {selectedVariant.current_stock_qty}
                            </Badge>
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
import { useState, useEffect } from 'react'
import { Box, Button, Heading, Input, Stack, Text, SimpleGrid, VStack } from '@chakra-ui/react'
import { getItems } from '../api/items'
import { getSalesmen } from '../api/salesmen'
import { getVariants } from '../api/variants'
import { createPurchase } from '../api/purchases'
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

const emptyForm = {
    itemName: '',
    length: '',
    measurement: '',
    salesmanName: '',
    quantity: '',
    price: '',
    date: new Date().toISOString().slice(0, 10),
}

function PurchasePage() {
    const [items, setItems] = useState([])
    const [salesmen, setSalesmen] = useState([])
    const [lengthOptions, setLengthOptions] = useState([])
    const [measurementOptions, setMeasurementOptions] = useState([])

    const [form, setForm] = useState(emptyForm)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        loadDropdownData()
    }, [])

    const loadDropdownData = async () => {
        const [itemsRes, salesmenRes, variantsRes] = await Promise.all([
            getItems(),
            getSalesmen(),
            getVariants(),
        ])
        setItems(itemsRes.data)
        setSalesmen(salesmenRes.data)

        const uniqueLengths = [...new Set(variantsRes.data.map((v) => v.length))]
        const uniqueMeasurements = [...new Set(variantsRes.data.map((v) => v.measurement))]
        setLengthOptions(uniqueLengths.map((l, i) => ({ id: i, name: l })))
        setMeasurementOptions(uniqueMeasurements.map((m, i) => ({ id: i, name: m })))
    }

    const updateField = (field, val) => setForm((f) => ({ ...f, [field]: val }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        if (!form.itemName || !form.length || !form.measurement || !form.salesmanName || !form.quantity || !form.price || !form.date) {
            setError('Please fill in all fields.')
            return
        }

        setLoading(true)
        try {
            await createPurchase({
                item_name: form.itemName,
                length: form.length,
                measurement: form.measurement,
                salesman_name: form.salesmanName,
                quantity: form.quantity,
                price: form.price,
                date: form.date,
            })
            setSuccess('Purchase recorded successfully.')
            setForm(emptyForm)
            loadDropdownData()
        } catch (err) {
            setError('Could not save purchase. Please check the values and try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <AppLayout>
            <Box maxW="lg" mx="auto" p={{ base: 4, sm: 6 }}>
                <Heading size="lg" color="black" mb={6}>
                    New Purchase
                </Heading>

                <form onSubmit={handleSubmit}>
                    <VStack gap={4} align="stretch">
                        <Field label="Item Name">
                            <SearchableDropdown
                                options={items}
                                value={form.itemName}
                                onChange={(val) => updateField('itemName', val)}
                                onSelect={(opt) => updateField('itemName', opt.name)}
                                onCreate={(text) => updateField('itemName', text)}
                                placeholder="e.g. Cotton Cloth"
                            />
                        </Field>

                        <SimpleGrid columns={2} gap={4}>
                            <Field label="Length">
                                <SearchableDropdown
                                    options={lengthOptions}
                                    value={form.length}
                                    onChange={(val) => updateField('length', val)}
                                    onSelect={(opt) => updateField('length', opt.name)}
                                    onCreate={(text) => updateField('length', text)}
                                    placeholder="e.g. 22mm"
                                />
                            </Field>
                            <Field label="Measurement">
                                <SearchableDropdown
                                    options={measurementOptions}
                                    value={form.measurement}
                                    onChange={(val) => updateField('measurement', val)}
                                    onSelect={(opt) => updateField('measurement', opt.name)}
                                    onCreate={(text) => updateField('measurement', text)}
                                    placeholder="e.g. 50/50"
                                />
                            </Field>
                        </SimpleGrid>

                        <Field label="Salesman">
                            <SearchableDropdown
                                options={salesmen}
                                value={form.salesmanName}
                                onChange={(val) => updateField('salesmanName', val)}
                                onSelect={(opt) => updateField('salesmanName', opt.name)}
                                onCreate={(text) => updateField('salesmanName', text)}
                                placeholder="e.g. Ali"
                            />
                        </Field>

                        <SimpleGrid columns={2} gap={4}>
                            <Field label="Quantity">
                                <Input
                                    type="number"
                                    value={form.quantity}
                                    onChange={(e) => updateField('quantity', e.target.value)}
                                    placeholder="0"
                                    {...fieldInputStyles}
                                />
                            </Field>
                            <Field label="Price (per unit)">
                                <Input
                                    type="number"
                                    value={form.price}
                                    onChange={(e) => updateField('price', e.target.value)}
                                    placeholder="0"
                                    {...fieldInputStyles}
                                />
                            </Field>
                        </SimpleGrid>

                        <Field label="Date">
                            <Input
                                type="date"
                                value={form.date}
                                onChange={(e) => updateField('date', e.target.value)}
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
                            Save Purchase
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

export default PurchasePage
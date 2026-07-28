import { useState } from 'react'
import { Box, Button, Input, Stack, Text, SimpleGrid, VStack } from '@chakra-ui/react'
import { createPurchase } from '../api/purchases'
import SearchableDropdown from './SearchableDropdown'

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

function PurchaseForm({ items, salesmen, lengthOptions, measurementOptions, onSaved }) {
    const [form, setForm] = useState(emptyForm)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const updateField = (field, val) => setForm((f) => ({ ...f, [field]: val }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

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
            setForm(emptyForm)
            onSaved()
        } catch (err) {
            setError('Could not save purchase. Please check the values and try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="xl" p={{ base: 4, sm: 6 }} mb={6}>
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

                    {error && (
                        <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="lg" px={3} py={2}>
                            <Text color="red.600" fontSize="sm">{error}</Text>
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

export default PurchaseForm
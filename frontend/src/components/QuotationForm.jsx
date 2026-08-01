import { Box, Button, HStack, Input, Stack, Text, VStack, IconButton, SimpleGrid } from '@chakra-ui/react'
import { PlusIcon, XIcon } from './Icons'

const fieldInputStyles = {
    bg: 'white',
    border: '1px solid',
    borderColor: 'gray.300',
    color: 'black',
    _placeholder: { color: 'gray.400' },
    _hover: { borderColor: 'gray.400' },
    _focus: { borderColor: 'black', boxShadow: '0 0 0 1px black' },
    borderRadius: 'xl',
    minH: '48px',
    fontSize: '15px',
}

function QuotationForm({ date, setDate, items, setItems, vatPercent, setVatPercent, advancePercent, setAdvancePercent }) {
    const updateItem = (idx, field, value) => {
        setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)))
    }
    const addItem = () => setItems((prev) => [...prev, { description: '', qty: '', price: '' }])
    const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx))

    return (
        <VStack align="stretch" gap={4}>
            <Field label="Date">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} {...fieldInputStyles} />
            </Field>

            <Stack gap={3}>
                <Text fontSize="14px" fontWeight="semibold" color="gray.700">Items</Text>
                {items.map((item, idx) => (
                    <Box key={idx} bg="white" border="1px solid" borderColor="gray.200" borderRadius="xl" p={3}>
                        <HStack justify="space-between" mb={2}>
                            <Text fontSize="13px" color="gray.500" fontWeight="semibold">Item {idx + 1}</Text>
                            {items.length > 1 && (
                                <IconButton size="xs" variant="ghost" color="red.500" onClick={() => removeItem(idx)} aria-label="Remove item">
                                    <XIcon size={14} />
                                </IconButton>
                            )}
                        </HStack>
                        <VStack gap={2} align="stretch">
                            <Input
                                placeholder="Description"
                                value={item.description}
                                onChange={(e) => updateItem(idx, 'description', e.target.value)}
                                {...fieldInputStyles}
                            />
                            <SimpleGrid columns={2} gap={2}>
                                <Input
                                    type="number" inputMode="decimal" placeholder="Qty"
                                    value={item.qty}
                                    onChange={(e) => updateItem(idx, 'qty', e.target.value)}
                                    {...fieldInputStyles}
                                />
                                <Input
                                    type="number" inputMode="decimal" placeholder="Price"
                                    value={item.price}
                                    onChange={(e) => updateItem(idx, 'price', e.target.value)}
                                    {...fieldInputStyles}
                                />
                            </SimpleGrid>
                        </VStack>
                    </Box>
                ))}
                <Button onClick={addItem} variant="outline" color="black" borderRadius="xl" minH="44px">
                    <PlusIcon size={16} />
                    Add item
                </Button>
            </Stack>

            <SimpleGrid columns={2} gap={3}>
                <Field label="VAT %">
                    <Input type="number" inputMode="decimal" value={vatPercent} onChange={(e) => setVatPercent(e.target.value)} {...fieldInputStyles} />
                </Field>
                <Field label="Advance %">
                    <Input type="number" inputMode="decimal" value={advancePercent} onChange={(e) => setAdvancePercent(e.target.value)} {...fieldInputStyles} />
                </Field>
            </SimpleGrid>
        </VStack>
    )
}

function Field({ label, children }) {
    return (
        <Stack gap={1.5}>
            <Text fontSize="14px" fontWeight="semibold" color="gray.700">{label}</Text>
            {children}
        </Stack>
    )
}

export default QuotationForm
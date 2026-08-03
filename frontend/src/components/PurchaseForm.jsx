import { useMemo, useRef, useState } from 'react'
import { Box, Button, HStack, Input, Stack, Text, SimpleGrid, VStack } from '@chakra-ui/react'
import { createPurchase, updatePurchase } from '../api/purchases'
import SearchableDropdown from './SearchableDropdown'
import { SaveIcon, XIcon, PlusIcon } from './Icons'
import FormMessage from './FormMessage'

const fieldInputStyles = {
    bg: 'white',
    border: '1px solid',
    borderColor: 'gray.300',
    color: 'black',
    _placeholder: { color: 'gray.400' },
    _hover: { borderColor: 'gray.400' },
    _focus: { borderColor: 'black', boxShadow: '0 0 0 1px black' },
    borderRadius: 'xl',
    minH: '54px',
    fontSize: '16px',
}

function PurchaseForm({ items, salesmen, parties, lengthOptions, editingPurchase, onSaved, onCancel }) {
    const isEditing = !!editingPurchase

    // Header state
    const [header, setHeader] = useState(() => ({
        partyName: editingPurchase?.party_name || '',
        partyContact: editingPurchase?.party_contact || '',
        salesmanName: editingPurchase?.salesman_name || '',
        date: editingPurchase?.date || new Date().toISOString().slice(0, 10),
    }))

    // Items state
    const [rows, setRows] = useState(() => isEditing ? (editingPurchase.items || []).map((item, index) => ({
        id: String(item.id || index + 1),
        itemName: item.item_name || '',
        length: item.length || '',
        quantity: String(item.quantity ?? ''),
        price: String(item.price ?? ''),
    })) : [{
        id: Date.now().toString(),
        itemName: '',
        length: '',
        quantity: '',
        price: '',
    }])

    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [keyboardMode, setKeyboardMode] = useState(false)

    // Header refs
    const dateRef = useRef(null)
    const partyRef = useRef(null)
    const partyContactRef = useRef(null)
    const salesmanRef = useRef(null)
    const rowRefs = useRef({})

    const updateHeader = (field, val) => setHeader((h) => ({ ...h, [field]: val }))
    const updateRow = (id, field, val) => {
        setRows(rows.map(r => r.id === id ? { ...r, [field]: val } : r))
    }
    const addRow = () => {
        setRows([...rows, { id: Date.now().toString(), itemName: '', length: '', quantity: '', price: '' }])
    }
    const removeRow = (id) => {
        if (rows.length > 1) {
            setRows(rows.filter(r => r.id !== id))
        }
    }
    const setRowRef = (id, field) => (el) => {
        rowRefs.current[id] = { ...rowRefs.current[id], [field]: el }
    }
    const focusRowField = (id, field) => {
        rowRefs.current[id]?.[field]?.focus()
    }

    const scrollFieldToTop = (ref) => {
        window.setTimeout(() => {
            ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 80)
    }
    const handleFieldFocus = (ref) => {
        setKeyboardMode(true)
        if (ref) scrollFieldToTop(ref)
    }
    const handleFieldBlur = () => {
        window.setTimeout(() => setKeyboardMode(false), 120)
    }

    const handlePartySelect = (opt) => {
        updateHeader('partyName', opt.name)
        updateHeader('partyContact', opt.contact || '')
    }

    const handlePartyCreate = (text) => {
        updateHeader('partyName', text)
        updateHeader('partyContact', '')
    }

    const disabledReason = useMemo(() => {
        if (!header.partyName.trim()) return 'Select company'
        if (!header.partyContact.trim()) return 'Enter company contact'
        if (!header.date) return 'Select date'
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i]
            if (!r.itemName.trim()) return `Select item for row ${i + 1}`
            if (!r.length.trim()) return `Select length for row ${i + 1}`
            if (!r.quantity) return `Enter quantity for row ${i + 1}`
            if (!r.price) return `Enter price for row ${i + 1}`
        }
        return ''
    }, [header, rows])

    const isValid = !disabledReason

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!isValid) {
            setError(disabledReason)
            return
        }

        setLoading(true)
        try {
            if (isEditing) {
                await updatePurchase(editingPurchase.id, {
                    party_name: header.partyName,
                    party_contact: header.partyContact,
                    salesman_name: header.salesmanName || null,
                    date: header.date,
                    items: rows.map((row) => ({
                        item_name: row.itemName,
                        length: row.length,
                        quantity: row.quantity,
                        price: row.price,
                    })),
                })
            } else {
                await createPurchase({
                    party_name: header.partyName,
                    party_contact: header.partyContact,
                    salesman_name: header.salesmanName || null,
                    date: header.date,
                    items: rows.map(r => ({
                        item_name: r.itemName,
                        length: r.length,
                        quantity: r.quantity,
                        price: r.price,
                    })),
                })
            }
            onSaved()
        } catch (err) {
            const detail = err.response?.data?.[0] || err.response?.data?.non_field_errors?.[0]
            setError(
                typeof detail === 'string'
                    ? detail
                    : 'Could not save purchase(s). Please check the values and try again.'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <Box>
            <form onSubmit={handleSubmit}>
                <VStack
                    gap={3}
                    align="stretch"
                    pb={keyboardMode
                        ? 'calc(132px + env(safe-area-inset-bottom))'
                        : 'calc(88px + env(safe-area-inset-bottom))'}
                >
                    <Field label="Date">
                        <Input
                            ref={dateRef}
                            type="date"
                            value={header.date}
                            onChange={(e) => updateHeader('date', e.target.value)}
                            onFocus={() => handleFieldFocus(dateRef)}
                            onBlur={handleFieldBlur}
                            enterKeyHint="next"
                            {...fieldInputStyles}
                        />
                    </Field>
                    <Field label="Company">
                        <SearchableDropdown
                            inputRef={partyRef}
                            options={parties}
                            value={header.partyName}
                            onChange={(val) => updateHeader('partyName', val)}
                            onSelect={handlePartySelect}
                            onCreate={handlePartyCreate}
                            onCommit={() => partyContactRef.current?.focus()}
                            onFocus={() => handleFieldFocus(partyRef)}
                            onBlur={handleFieldBlur}
                            enterKeyHint="next"
                            placeholder="Type to search company"
                        />
                    </Field>
                    <Field label="Contact">
                        <Input
                            ref={partyContactRef}
                            type="tel"
                            inputMode="tel"
                            value={header.partyContact}
                            onChange={(e) => updateHeader('partyContact', e.target.value.replace(/[^\d+]/g, ''))}
                            onFocus={() => handleFieldFocus(partyContactRef)}
                            onBlur={handleFieldBlur}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    salesmanRef.current?.focus()
                                }
                            }}
                            enterKeyHint="next"
                            placeholder="Enter contact number"
                            {...fieldInputStyles}
                        />
                    </Field>
                    <Field label="Salesman">
                        <SearchableDropdown
                            inputRef={salesmanRef}
                            options={salesmen}
                            value={header.salesmanName}
                            onChange={(val) => updateHeader('salesmanName', val)}
                            onSelect={(opt) => updateHeader('salesmanName', opt.name)}
                            onCreate={(text) => updateHeader('salesmanName', text)}
                            onFocus={() => handleFieldFocus(salesmanRef)}
                            onBlur={handleFieldBlur}
                            enterKeyHint="done"
                            placeholder="Optional"
                        />
                    </Field>

                    {rows.map((row, index) => (
                        <Box key={row.id} bg="white" p={3} borderRadius="xl" borderWidth="1px" borderColor="gray.200">
                            <VStack align="stretch" gap={3}>
                                <HStack justify="space-between" align="center">
                                    <Text fontWeight="semibold" fontSize="14px" color="gray.600">Item {index + 1}</Text>
                                    {!isEditing && rows.length > 1 && (
                                        <Button size="sm" variant="ghost" color="gray.500" _hover={{ bg: 'gray.50', color: 'black' }} onClick={() => removeRow(row.id)}>
                                            Remove
                                        </Button>
                                    )}
                                </HStack>
                                <Field label="Item">
                                    <SearchableDropdown
                                        inputRef={setRowRef(row.id, 'item')}
                                        options={items}
                                        value={row.itemName}
                                        onChange={(val) => updateRow(row.id, 'itemName', val)}
                                        onSelect={(opt) => updateRow(row.id, 'itemName', opt.name)}
                                        onCreate={(text) => updateRow(row.id, 'itemName', text)}
                                        onCommit={() => focusRowField(row.id, 'length')}
                                        onFocus={() => handleFieldFocus(rowRefs.current[row.id]?.item ? { current: rowRefs.current[row.id].item } : null)}
                                        onBlur={handleFieldBlur}
                                        enterKeyHint="next"
                                        placeholder="Type to search item"
                                    />
                                </Field>
                                <Field label="Length">
                                    <SearchableDropdown
                                        inputRef={setRowRef(row.id, 'length')}
                                        options={lengthOptions}
                                        value={row.length}
                                        onChange={(val) => updateRow(row.id, 'length', val)}
                                        onSelect={(opt) => updateRow(row.id, 'length', opt.name)}
                                        onCreate={(text) => updateRow(row.id, 'length', text)}
                                        onCommit={() => focusRowField(row.id, 'quantity')}
                                        onFocus={() => handleFieldFocus(rowRefs.current[row.id]?.length ? { current: rowRefs.current[row.id].length } : null)}
                                        onBlur={handleFieldBlur}
                                        enterKeyHint="next"
                                        placeholder="Type to search length"
                                    />
                                </Field>
                                <SimpleGrid columns={2} gap={4}>
                                    <Field label="Qty">
                                        <Input
                                            ref={setRowRef(row.id, 'quantity')}
                                            type="number"
                                            inputMode="numeric"
                                            value={row.quantity}
                                            onChange={(e) => updateRow(row.id, 'quantity', e.target.value)}
                                            onFocus={() => handleFieldFocus(rowRefs.current[row.id]?.quantity ? { current: rowRefs.current[row.id].quantity } : null)}
                                            onBlur={handleFieldBlur}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    focusRowField(row.id, 'price')
                                                }
                                            }}
                                            enterKeyHint="next"
                                            placeholder="0"
                                            {...fieldInputStyles}
                                        />
                                    </Field>
                                    <Field label="Price">
                                        <Input
                                            ref={setRowRef(row.id, 'price')}
                                            type="number"
                                            inputMode="decimal"
                                            value={row.price}
                                            onChange={(e) => updateRow(row.id, 'price', e.target.value)}
                                            onFocus={() => handleFieldFocus(rowRefs.current[row.id]?.price ? { current: rowRefs.current[row.id].price } : null)}
                                            onBlur={handleFieldBlur}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    rowRefs.current[row.id]?.price?.blur()
                                                }
                                            }}
                                            enterKeyHint="done"
                                            placeholder="0"
                                            {...fieldInputStyles}
                                        />
                                    </Field>
                                </SimpleGrid>
                            </VStack>
                        </Box>
                    ))}

                    {!isEditing && (
                        <Button
                            type="button"
                            onClick={addRow}
                            variant="outline"
                            color="black"
                            bg="white"
                            border="1px dashed"
                            borderColor="gray.300"
                            minH="54px"
                            borderRadius="xl"
                            _hover={{ borderColor: 'gray.400', bg: 'gray.50' }}
                        >
                            <PlusIcon />
                            Add another item
                        </Button>
                    )}

                    {error && (
                        <FormMessage tone="error">{error}</FormMessage>
                    )}

                    <HStack
                        gap={3}
                        align="stretch"
                        position="fixed"
                        left={0}
                        right={0}
                        bottom={0}
                        zIndex={40}
                        bg="white"
                        borderTop="1px solid"
                        borderColor="gray.200"
                        px={keyboardMode ? 3 : 4}
                        pt={keyboardMode ? 2 : 3}
                        pb={keyboardMode ? 2 : 'calc(12px + env(safe-area-inset-bottom))'}
                    >
                        {onCancel && !keyboardMode && (
                            <Button
                                type="button"
                                minH="52px"
                                flex="1"
                                borderRadius="xl"
                                variant="outline"
                                color="black"
                                onClick={onCancel}
                            >
                                <XIcon />
                                Cancel
                            </Button>
                        )}
                        <Button
                            type="submit"
                            loading={loading}
                            disabled={!isValid}
                            minH={keyboardMode ? '44px' : '52px'}
                            flex={keyboardMode ? '1' : '2'}
                            borderRadius="xl"
                            bg="black"
                            color="white"
                            fontWeight="semibold"
                            _hover={{ bg: 'gray.800' }}
                            _disabled={{ bg: 'gray.300', color: 'gray.600', cursor: 'not-allowed' }}
                        >
                            <SaveIcon />
                            {isEditing ? 'Save changes' : 'Save'}
                        </Button>
                    </HStack>
                </VStack>
            </form>
        </Box>
    )
}

function Field({ label, children }) {
    return (
        <Stack gap={1.5}>
            {label && (
                <Text fontSize="14px" fontWeight="semibold" color="gray.700">
                    {label}
                </Text>
            )}
            {children}
        </Stack>
    )
}

export default PurchaseForm

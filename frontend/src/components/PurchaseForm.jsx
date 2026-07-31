import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, HStack, Input, Stack, Text, SimpleGrid, VStack } from '@chakra-ui/react'
import { createPurchase, updatePurchase } from '../api/purchases'
import SearchableDropdown from './SearchableDropdown'
import { SaveIcon, XIcon } from './Icons'
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

const emptyForm = {
    itemName: '',
    length: '',
    partyName: '',
    partyContact: '',
    salesmanName: '',
    quantity: '',
    price: '',
    date: new Date().toISOString().slice(0, 10),
}

function PurchaseForm({ items, salesmen, parties, lengthOptions, editingPurchase, onSaved, onCancel }) {
    const isEditing = !!editingPurchase

    const [form, setForm] = useState(() =>
        editingPurchase
            ? {
                itemName: editingPurchase.item_name || '',
                length: editingPurchase.length || '',
                partyName: editingPurchase.party_name || '',
                partyContact: editingPurchase.party_contact || '',
                salesmanName: editingPurchase.salesman_name || '',
                quantity: String(editingPurchase.quantity ?? ''),
                price: String(editingPurchase.price ?? ''),
                date: editingPurchase.date || new Date().toISOString().slice(0, 10),
            }
            : emptyForm
    )
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [keyboardMode, setKeyboardMode] = useState(false)
    const itemRef = useRef(null)
    const lengthRef = useRef(null)
    const dateRef = useRef(null)
    const partyRef = useRef(null)
    const partyContactRef = useRef(null)
    const salesmanRef = useRef(null)
    const quantityRef = useRef(null)
    const priceRef = useRef(null)

    const updateField = (field, val) => setForm((f) => ({ ...f, [field]: val }))
    const scrollFieldToTop = (ref) => {
        window.setTimeout(() => {
            ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 80)
    }
    const handleFieldFocus = (ref) => {
        setKeyboardMode(true)
        scrollFieldToTop(ref)
    }
    const handleFieldBlur = () => {
        window.setTimeout(() => setKeyboardMode(false), 120)
    }

    useEffect(() => {
        if (isEditing) {
            quantityRef.current?.focus()
        } else {
            itemRef.current?.focus()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const partyContactOptions = form.partyContact
        ? [{ id: 'current', name: form.partyContact }]
        : []

    const handlePartySelect = (opt) => {
        updateField('partyName', opt.name)
        updateField('partyContact', opt.contact || '')
    }

    const handlePartyCreate = (text) => {
        updateField('partyName', text)
        updateField('partyContact', '')
    }

    const disabledReason = useMemo(() => {
        if (!form.itemName.trim()) return 'Select item first'
        if (!form.length.trim()) return 'Select length'
        if (!form.quantity) return 'Enter quantity'
        if (!form.price) return 'Enter price'
        if (!form.partyName.trim()) return 'Select company'
        if (!form.partyContact.trim()) return 'Enter company contact'
        if (!form.date) return 'Select date'
        return ''
    }, [form])

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
                    party_name: form.partyName,
                    party_contact: form.partyContact,
                    salesman_name: form.salesmanName || null,
                    quantity: form.quantity,
                    price: form.price,
                    date: form.date,
                })
            } else {
                await createPurchase({
                    item_name: form.itemName,
                    length: form.length,
                    party_name: form.partyName,
                    party_contact: form.partyContact,
                    salesman_name: form.salesmanName || null,
                    quantity: form.quantity,
                    price: form.price,
                    date: form.date,
                })
                setForm(emptyForm)
            }
            onSaved()
        } catch (err) {
            const detail = err.response?.data?.[0] || err.response?.data?.non_field_errors?.[0]
            setError(
                typeof detail === 'string'
                    ? detail
                    : isEditing
                        ? 'Could not save changes. Please check the values and try again.'
                        : 'Could not save purchase. Please check the values and try again.'
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
                    <Field label="">
                        <Input
                            ref={dateRef}
                            type="date"
                            value={form.date}
                            onChange={(e) => updateField('date', e.target.value)}
                            onFocus={() => handleFieldFocus(dateRef)}
                            onBlur={handleFieldBlur}
                            enterKeyHint="next"
                            {...fieldInputStyles}
                        />
                    </Field>

                    <Field label="Item">
                        {isEditing ? (
                            <Input
                                value={form.itemName}
                                readOnly
                                disabled
                                {...fieldInputStyles}
                                bg="gray.100"
                                color="gray.600"
                                cursor="not-allowed"
                            />
                        ) : (
                            <SearchableDropdown
                                inputRef={itemRef}
                                options={items}
                                value={form.itemName}
                                onChange={(val) => updateField('itemName', val)}
                                onSelect={(opt) => updateField('itemName', opt.name)}
                                onCreate={(text) => updateField('itemName', text)}
                                onCommit={() => lengthRef.current?.focus()}
                                onFocus={() => handleFieldFocus(itemRef)}
                                onBlur={handleFieldBlur}
                                enterKeyHint="next"
                                placeholder="Type to search item"
                            />
                        )}
                    </Field>

                    <Field label="Length">
                        {isEditing ? (
                            <Input
                                value={form.length}
                                readOnly
                                disabled
                                {...fieldInputStyles}
                                bg="gray.100"
                                color="gray.600"
                                cursor="not-allowed"
                            />
                        ) : (
                            <SearchableDropdown
                                inputRef={lengthRef}
                                options={lengthOptions}
                                value={form.length}
                                onChange={(val) => updateField('length', val)}
                                onSelect={(opt) => updateField('length', opt.name)}
                                onCreate={(text) => updateField('length', text)}
                                onCommit={() => quantityRef.current?.focus()}
                                onFocus={() => handleFieldFocus(lengthRef)}
                                onBlur={handleFieldBlur}
                                enterKeyHint="next"
                                placeholder="Type to search length"
                            />
                        )}
                    </Field>

                    <SimpleGrid columns={1} gap={4}>
                        <Field label="Qty">
                            <Input
                                ref={quantityRef}
                                type="number"
                                inputMode="numeric"
                                value={form.quantity}
                                onChange={(e) => updateField('quantity', e.target.value)}
                                onFocus={() => handleFieldFocus(quantityRef)}
                                onBlur={handleFieldBlur}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        priceRef.current?.focus()
                                    }
                                }}
                                enterKeyHint="next"
                                placeholder="0"
                                {...fieldInputStyles}
                            />
                        </Field>
                        <Field label="Price">
                            <Input
                                ref={priceRef}
                                type="number"
                                inputMode="decimal"
                                value={form.price}
                                onChange={(e) => updateField('price', e.target.value)}
                                onFocus={() => handleFieldFocus(priceRef)}
                                onBlur={handleFieldBlur}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        salesmanRef.current?.focus()
                                    }
                                }}
                                enterKeyHint="next"
                                placeholder="0"
                                {...fieldInputStyles}
                            />
                        </Field>
                    </SimpleGrid>

                    <Field label="Salesman">
                        <SearchableDropdown
                            inputRef={salesmanRef}
                            options={salesmen}
                            value={form.salesmanName}
                            onChange={(val) => updateField('salesmanName', val)}
                            onSelect={(opt) => updateField('salesmanName', opt.name)}
                            onCreate={(text) => updateField('salesmanName', text)}
                            onCommit={() => partyRef.current?.focus()}
                            onFocus={() => handleFieldFocus(salesmanRef)}
                            onBlur={handleFieldBlur}
                            enterKeyHint="next"
                            placeholder="Optional"
                        />
                    </Field>

                    <Field label="Company">
                        <SearchableDropdown
                            inputRef={partyRef}
                            options={parties}
                            value={form.partyName}
                            onChange={(val) => updateField('partyName', val)}
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
                        <SearchableDropdown
                            inputRef={partyContactRef}
                            options={partyContactOptions}
                            value={form.partyContact}
                            onChange={(val) => updateField('partyContact', val.replace(/[^\d+]/g, ''))}
                            onSelect={(opt) => updateField('partyContact', opt.name)}
                            onCreate={(text) => updateField('partyContact', text)}
                            onCommit={() => partyContactRef.current?.blur()}
                            onFocus={() => handleFieldFocus(partyContactRef)}
                            onBlur={handleFieldBlur}
                            enterKeyHint="done"
                            placeholder="Enter contact number"
                            type="text"
                            inputMode="numeric"
                        />
                    </Field>

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
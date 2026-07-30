import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, HStack, Input, Stack, Text, SimpleGrid, VStack } from '@chakra-ui/react'
import { createPurchase } from '../api/purchases'
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
    measurement: '',
    partyName: '',
    partyContact: '',
    salesmanName: '',
    quantity: '',
    price: '',
    date: new Date().toISOString().slice(0, 10),
}

function PurchaseForm({ items, salesmen, parties, lengthOptions, measurementOptions, onSaved, onCancel }) {
    const [form, setForm] = useState(emptyForm)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [keyboardMode, setKeyboardMode] = useState(false)
    const itemRef = useRef(null)
    const lengthRef = useRef(null)
    const measurementRef = useRef(null)
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
        itemRef.current?.focus()
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
        if (!form.measurement.trim()) return 'Select measurement'
        if (!form.partyName.trim()) return 'Select company'
        if (!form.partyContact.trim()) return 'Enter company contact'
        if (!form.quantity) return 'Enter quantity'
        if (!form.price) return 'Enter price'
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
            await createPurchase({
                item_name: form.itemName,
                length: form.length,
                measurement: form.measurement,
                party_name: form.partyName,
                party_contact: form.partyContact,
                salesman_name: form.salesmanName || null,
                quantity: form.quantity,
                price: form.price,
                date: form.date,
            })
            setForm(emptyForm)
            onSaved()
        } catch {
            setError('Could not save purchase. Please check the values and try again.')
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
                    </Field>

                    <SimpleGrid columns={1} gap={4}>
                        <Field label="Length">
                            <SearchableDropdown
                                inputRef={lengthRef}
                                options={lengthOptions}
                                value={form.length}
                                onChange={(val) => updateField('length', val)}
                                onSelect={(opt) => updateField('length', opt.name)}
                                onCreate={(text) => updateField('length', text)}
                                onCommit={() => measurementRef.current?.focus()}
                                onFocus={() => handleFieldFocus(lengthRef)}
                                onBlur={handleFieldBlur}
                                enterKeyHint="next"
                                placeholder="Type to search length"
                            />
                        </Field>
                        <Field label="Measure">
                            <SearchableDropdown
                                inputRef={measurementRef}
                                options={measurementOptions}
                                value={form.measurement}
                                onChange={(val) => updateField('measurement', val)}
                                onSelect={(opt) => updateField('measurement', opt.name)}
                                onCreate={(text) => updateField('measurement', text)}
                                onCommit={() => partyRef.current?.focus()}
                                onFocus={() => handleFieldFocus(measurementRef)}
                                onBlur={handleFieldBlur}
                                enterKeyHint="next"
                                placeholder="Type to search measurement"
                            />
                        </Field>
                    </SimpleGrid>

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

                    <Field label="Company contact">
                        <SearchableDropdown
                            inputRef={partyContactRef}
                            options={partyContactOptions}
                            value={form.partyContact}
                            onChange={(val) => updateField('partyContact', val)}
                            onSelect={(opt) => updateField('partyContact', opt.name)}
                            onCreate={(text) => updateField('partyContact', text)}
                            onCommit={() => quantityRef.current?.focus()}
                            onFocus={() => handleFieldFocus(partyContactRef)}
                            onBlur={handleFieldBlur}
                            enterKeyHint="next"
                            placeholder="Enter contact number"
                        />
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
                                        priceRef.current?.blur()
                                    }
                                }}
                                enterKeyHint="done"
                                placeholder="0"
                                {...fieldInputStyles}
                            />
                        </Field>
                    </SimpleGrid>

                    <Field label="Salesman optional">
                        <SearchableDropdown
                            inputRef={salesmanRef}
                            options={salesmen}
                            value={form.salesmanName}
                            onChange={(val) => updateField('salesmanName', val)}
                            onSelect={(opt) => updateField('salesmanName', opt.name)}
                            onCreate={(text) => updateField('salesmanName', text)}
                            onFocus={() => handleFieldFocus(salesmanRef)}
                            onBlur={handleFieldBlur}
                            enterKeyHint="done"
                            placeholder="Optional"
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
                            Save
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
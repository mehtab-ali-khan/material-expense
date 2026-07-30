import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, HStack, Input, Stack, Text, SimpleGrid, VStack, Badge } from '@chakra-ui/react'
import { getVariants } from '../api/variants'
import { createSale } from '../api/sales'
import SearchableDropdown from './SearchableDropdown'
import SelectDropdown from './SelectDropdown'
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

function SaleForm({ items, salesmen, parties, onSaved, onCancel }) {
    const [variants, setVariants] = useState([])
    const [selectedItem, setSelectedItem] = useState(null)
    const [selectedLength, setSelectedLength] = useState(null)
    const [selectedVariant, setSelectedVariant] = useState(null)

    const [partyName, setPartyName] = useState('')
    const [partyContact, setPartyContact] = useState('')
    const [salesmanName, setSalesmanName] = useState('')
    const [quantity, setQuantity] = useState('')
    const [salePrice, setSalePrice] = useState('')
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

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

    const handleItemSelect = async (opt) => {
        setSelectedItem(opt)
        setSelectedLength(null)
        setSelectedVariant(null)
        const res = await getVariants(opt.id)
        setVariants(res.data)
    }

    const lengthOptions = [...new Set(variants.map((v) => v.length))].map((l, i) => ({ id: i, name: l }))

    const handleLengthSelect = (opt) => {
        setSelectedLength(opt.name)
        const variant = variants.find((v) => v.length === opt.name)
        setSelectedVariant(variant || null)
    }

    const partyContactOptions = partyContact
        ? [{ id: 'current', name: partyContact }]
        : []

    const handlePartySelect = (opt) => {
        setPartyName(opt.name)
        setPartyContact(opt.contact || '')
    }

    const handlePartyCreate = (text) => {
        setPartyName(text)
        setPartyContact('')
    }

    const disabledReason = useMemo(() => {
        if (!selectedItem) return 'Select item first'
        if (!selectedVariant) return 'Select length'
        if (Number(selectedVariant.current_stock_qty) <= 0) return 'No stock available'
        if (!quantity) return 'Enter quantity'
        if (Number(quantity) > Number(selectedVariant.current_stock_qty)) return 'Not enough stock'
        if (!salePrice) return 'Enter sale price'
        if (!partyName.trim()) return 'Select company'
        if (!partyContact.trim()) return 'Enter company contact'
        if (!date) return 'Select date'
        return ''
    }, [date, partyContact, partyName, quantity, salePrice, selectedItem, selectedVariant])

    const isValid = !disabledReason

    const resetForm = () => {
        setSelectedItem(null)
        setSelectedLength(null)
        setSelectedVariant(null)
        setVariants([])
        setPartyName('')
        setPartyContact('')
        setSalesmanName('')
        setQuantity('')
        setSalePrice('')
        setDate(new Date().toISOString().slice(0, 10))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!isValid) {
            setError(disabledReason)
            return
        }

        if (Number(quantity) > Number(selectedVariant.current_stock_qty)) {
            setError('Not enough stock')
            return
        }

        setLoading(true)
        try {
            await createSale({
                variant: selectedVariant.id,
                party_name: partyName,
                party_contact: partyContact,
                salesman_name: salesmanName || null,
                quantity,
                sale_price: salePrice,
                date,
            })
            resetForm()
            onSaved()
        } catch (err) {
            const detail = err.response?.data?.[0] || err.response?.data?.non_field_errors?.[0]
            setError(detail?.toLowerCase().includes('stock') ? 'Not enough stock' : 'Could not save sale. Check the values and try again.')
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
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            onFocus={() => handleFieldFocus(dateRef)}
                            onBlur={handleFieldBlur}
                            enterKeyHint="next"
                            {...fieldInputStyles}
                        />
                    </Field>

                    <Field label="Item">
                        <SelectDropdown
                            inputRef={itemRef}
                            options={items}
                            value={selectedItem?.name || ''}
                            onSelect={handleItemSelect}
                            onCommit={() => lengthRef.current?.focus()}
                            onFocus={() => handleFieldFocus(itemRef)}
                            onBlur={handleFieldBlur}
                            enterKeyHint="next"
                            placeholder="Type to search item"
                        />
                    </Field>

                    <Field label="Length">
                        <SelectDropdown
                            inputRef={lengthRef}
                            options={lengthOptions}
                            value={selectedLength || ''}
                            onSelect={handleLengthSelect}
                            onCommit={() => quantityRef.current?.focus()}
                            onFocus={() => handleFieldFocus(lengthRef)}
                            onBlur={handleFieldBlur}
                            enterKeyHint="next"
                            placeholder="Type to search length"
                            disabled={!selectedItem}
                        />
                    </Field>

                    {selectedItem && variants.length === 0 && (
                        <FormMessage tone="error">No stock available</FormMessage>
                    )}

                    {selectedVariant && (
                        <Box display="flex" gap={2} flexWrap="wrap">
                            <Badge bg={Number(selectedVariant.current_stock_qty) > 0 ? 'green.50' : 'red.50'} color={Number(selectedVariant.current_stock_qty) > 0 ? 'green.700' : 'red.700'} px={3} py={1.5} borderRadius="full" fontSize="12px">
                                In stock: {selectedVariant.current_stock_qty}
                            </Badge>
                        </Box>
                    )}

                    <SimpleGrid columns={1} gap={4}>
                        <Field label="Qty">
                            <Input
                                ref={quantityRef}
                                type="number"
                                inputMode="numeric"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
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
                                disabled={!selectedVariant}
                                {...fieldInputStyles}
                                _disabled={{ bg: 'gray.100', color: 'gray.500', cursor: 'not-allowed' }}
                            />
                        </Field>
                        <Field label="Sale price">
                            <Input
                                ref={priceRef}
                                type="number"
                                inputMode="decimal"
                                value={salePrice}
                                onChange={(e) => setSalePrice(e.target.value)}
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

                    <Field label="Salesman optional">
                        <SearchableDropdown
                            inputRef={salesmanRef}
                            options={salesmen}
                            value={salesmanName}
                            onChange={setSalesmanName}
                            onSelect={(opt) => setSalesmanName(opt.name)}
                            onCreate={(text) => setSalesmanName(text)}
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
                            value={partyName}
                            onChange={setPartyName}
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
                            value={partyContact}
                            onChange={(val) => setPartyContact(val.replace(/[^\d+]/g, ''))}
                            onSelect={(opt) => setPartyContact(opt.name)}
                            onCreate={(text) => setPartyContact(text)}
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

                    {!isValid && !error && disabledReason.toLowerCase().includes('stock') && (
                        <FormMessage tone="error">
                            {disabledReason}
                        </FormMessage>
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

export default SaleForm
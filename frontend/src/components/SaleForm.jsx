import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, HStack, Input, Stack, Text, SimpleGrid, VStack, Badge } from '@chakra-ui/react'
import { getVariants } from '../api/variants'
import { createSale, updateSale } from '../api/sales'
import SearchableDropdown from './SearchableDropdown'
import SelectDropdown from './SelectDropdown'
import { PlusIcon, SaveIcon, XIcon } from './Icons'
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

const getApiErrorMessage = (err, fallback) => {
    const data = err.response?.data
    if (typeof data === 'string') return data
    if (typeof data?.detail === 'string') return data.detail
    if (typeof data?.[0] === 'string') return data[0]
    if (typeof data?.non_field_errors?.[0] === 'string') return data.non_field_errors[0]
    const firstFieldError = Object.values(data || {}).flat().find((value) => typeof value === 'string')
    return firstFieldError || fallback
}

function SaleForm({ items, salesmen, parties, editingSale, onSaved, onCancel }) {
    const isEditing = !!editingSale

    const [header, setHeader] = useState(() => ({
        partyName: editingSale?.party_name || '',
        partyContact: editingSale?.party_contact || '',
        salesmanName: editingSale?.salesman_name || '',
        date: editingSale?.date || new Date().toISOString().slice(0, 10),
    }))
    const [rows, setRows] = useState(() => isEditing ? (editingSale.items || []).map((item, index) => ({
        id: String(item.id || index + 1),
        itemId: item.item_id || null,
        itemName: item.item_name || '',
        size: item.size || '',
        quantity: String(item.quantity ?? ''),
        salePrice: String(item.sale_price ?? ''),
        variants: [{ id: item.variant, size: item.size, current_stock_qty: item.current_stock_qty ?? 0 }],
        selectedVariant: { id: item.variant, size: item.size, current_stock_qty: item.current_stock_qty ?? 0 },
        loadingVariants: false,
    })) : [{
        id: Date.now().toString(),
        itemId: null,
        itemName: '',
        size: '',
        quantity: '',
        salePrice: '',
        variants: [],
        selectedVariant: null,
        loadingVariants: false,
    }])

    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [keyboardMode, setKeyboardMode] = useState(false)
    const dateRef = useRef(null)
    const partyRef = useRef(null)
    const partyContactRef = useRef(null)
    const salesmanRef = useRef(null)
    const rowRefs = useRef({})

    const updateHeader = (field, value) => setHeader((current) => ({ ...current, [field]: value }))
    const updateRow = (rowId, field, value) => {
        setRows((current) => current.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)))
    }
    const setRowRef = (rowId, field) => (element) => {
        rowRefs.current[rowId] = { ...rowRefs.current[rowId], [field]: element }
    }
    const focusRowField = (rowId, field) => {
        rowRefs.current[rowId]?.[field]?.focus()
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

    useEffect(() => {
        if (isEditing) {
            dateRef.current?.focus()
        }
    }, [isEditing])

    useEffect(() => {
        if (!isEditing || !editingSale?.items?.length) return
        const loadInitialVariants = async () => {
            const loaded = await Promise.all(editingSale.items.map(async (item) => {
                if (!item.item_id) return { item, variants: [] }
                const res = await getVariants(item.item_id)
                return { item, variants: res.data }
            }))
            setRows((current) => current.map((row, index) => {
                const { item, variants } = loaded[index] || {}
                if (!item) return row
                const priceOptions = variants.filter((v) => v.size === item.size && Number(v.current_stock_qty) > 0)
                return {
                    ...row,
                    variants,
                    priceOptions,
                    selectedVariant: variants.find((variant) => variant.id === item.variant) || (priceOptions.length === 1 ? priceOptions[0] : null),
                    loadingVariants: false,
                }
            }))
        }
        loadInitialVariants().finally(() => {
            setRows((current) => current.map((row) => ({ ...row, loadingVariants: false })))
        })
    }, [isEditing, editingSale])

    const partyContactOptions = header.partyContact ? [{ id: 'current', name: header.partyContact }] : []

    const handlePartySelect = (opt) => {
        updateHeader('partyName', opt.name)
        updateHeader('partyContact', opt.contact || '')
    }

    const handlePartyCreate = (text) => {
        updateHeader('partyName', text)
        updateHeader('partyContact', '')
    }

    const handleAddRow = () => {
        setRows((current) => [
            ...current,
            {
                id: Date.now().toString(),
                itemId: null,
                itemName: '',
                size: '',
                quantity: '',
                salePrice: '',
                variants: [],
                selectedVariant: null,
                loadingVariants: false,
            },
        ])
    }

    const removeRow = (rowId) => {
        setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== rowId) : current))
    }

    const handleItemSelect = async (rowId, opt) => {
        setError('')
        updateRow(rowId, 'itemId', opt.id)
        updateRow(rowId, 'itemName', opt.name)
        updateRow(rowId, 'size', '')
        updateRow(rowId, 'selectedVariant', null)
        updateRow(rowId, 'loadingVariants', true)
        const res = await getVariants(opt.id)
        updateRow(rowId, 'variants', res.data)
        updateRow(rowId, 'loadingVariants', false)
    }

    const handleSizeSelect = (rowId, opt) => {
        const row = rows.find((r) => r.id === rowId)
        const matches = (row?.variants || []).filter(
            (v) => v.size === opt.name && Number(v.current_stock_qty) > 0
        )
        updateRow(rowId, 'size', opt.name)
        updateRow(rowId, 'priceOptions', matches)

        if (matches.length === 1) {
            if (isVariantTakenElsewhere(matches[0].id, rowId)) {
                updateRow(rowId, 'selectedVariant', null)
                setError('This item variant is already selected in another row.')
                return
            }
            setError('')
            updateRow(rowId, 'selectedVariant', matches[0])
        } else {
            setError('')
            updateRow(rowId, 'selectedVariant', null)
        }
    }
    const handlePriceSelect = (rowId, variant) => {
        if (!variant) return
        if (isVariantTakenElsewhere(variant.id, rowId)) {
            setError('This item variant is already selected in another row.')
            return
        }
        setError('')
        updateRow(rowId, 'selectedVariant', variant)
    }

    const getAvailableStock = (row) => {
        const selected = row.selectedVariant || (row.priceOptions ?? (row.size ? (row.variants || []).filter((v) => v.size === row.size && Number(v.current_stock_qty) > 0) : [])?.[0])
        if (!selected) return 0
        return Number(selected.current_stock_qty ?? 0)
    }

    const isVariantTakenElsewhere = (variantId, currentRowId) => {
        return rows.some((r) => {
            if (r.id === currentRowId) return false
            const rowVariantId = r.selectedVariant?.id
            return rowVariantId === variantId
        })
    }
    const disabledReason = useMemo(() => {
        if (!header.partyName.trim()) return 'Select company'
        if (!header.partyContact.trim()) return 'Enter company contact'
        if (!header.date) return 'Select date'

        const seenVariantIds = new Set()

        for (let index = 0; index < rows.length; index += 1) {
            const row = rows[index]
            if (!row.itemName.trim()) return `Select item for row ${index + 1}`
            if (!row.size.trim()) return `Select size for row ${index + 1}`
            if (!row.quantity) return `Enter quantity for row ${index + 1}`
            if (!row.salePrice) return `Enter sale price for row ${index + 1}`

            const availableStock = getAvailableStock(row)
            const originalQuantity = isEditing ? Number(editingSale.items[index]?.quantity || 0) : 0
            const editableStock = availableStock + originalQuantity
            if (editableStock <= 0) return `No stock available for row ${index + 1}`
            if (Number(row.quantity) > editableStock) return `Not enough stock for row ${index + 1}`

            const variantId = row.selectedVariant?.id
            if (variantId != null) {
                if (seenVariantIds.has(variantId)) {
                    return `This item variant is already selected in another row.`
                }
                seenVariantIds.add(variantId)
            }
        }
        return ''
    }, [editingSale, header, isEditing, rows])

    useEffect(() => {
        if (disabledReason?.includes('already selected')) {
            setError(disabledReason)
        } else if (error?.includes('already selected')) {
            setError('')
        }
    }, [disabledReason])

    const isValid = !disabledReason

    const resetForm = () => {
        setHeader({
            partyName: '',
            partyContact: '',
            salesmanName: '',
            date: new Date().toISOString().slice(0, 10),
        })
        setRows([{
            id: Date.now().toString(),
            itemId: null,
            itemName: '',
            size: '',
            quantity: '',
            salePrice: '',
            variants: [],
            selectedVariant: null,
            loadingVariants: false,
        }])
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!isValid) {
            setError(disabledReason)
            return
        }

        const getRowVariantId = (row) => {
            if (row.selectedVariant) return row.selectedVariant.id
            const options = row.priceOptions ?? (row.size ? (row.variants || []).filter((v) => v.size === row.size && Number(v.current_stock_qty) > 0) : [])
            return options.length ? options[0].id : null
        }

        setLoading(true)
        try {
            if (isEditing) {
                await updateSale(editingSale.id, {
                    party_name: header.partyName,
                    party_contact: header.partyContact,
                    salesman_name: header.salesmanName || null,
                    date: header.date,
                    items: rows.map((row) => ({
                        id: row.id,
                        variant: getRowVariantId(row),
                        quantity: row.quantity,
                        sale_price: row.salePrice,
                    })),
                })
            } else {
                await createSale({
                    party_name: header.partyName,
                    party_contact: header.partyContact,
                    salesman_name: header.salesmanName || null,
                    date: header.date,
                    items: rows.map((row) => ({
                        variant: getRowVariantId(row),
                        quantity: row.quantity,
                        sale_price: row.salePrice,
                    })),
                })
                resetForm()
            }
            onSaved()
        } catch (err) {
            setError(getApiErrorMessage(
                err,
                isEditing
                    ? 'Could not save changes. Please check the values and try again.'
                    : 'Could not save sale(s). Check the values and try again.'
            ))
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
                        <SearchableDropdown
                            inputRef={partyContactRef}
                            options={partyContactOptions}
                            value={header.partyContact}
                            onChange={(val) => updateHeader('partyContact', val.replace(/[^\d+]/g, ''))}
                            onSelect={(opt) => updateHeader('partyContact', opt.name)}
                            onCreate={(text) => updateHeader('partyContact', text)}
                            onCommit={() => salesmanRef.current?.focus()}
                            onFocus={() => handleFieldFocus(partyContactRef)}
                            onBlur={handleFieldBlur}
                            enterKeyHint="next"
                            placeholder="Enter contact number"
                            type="text"
                            inputMode="numeric"
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
                            enterKeyHint="next"
                            placeholder="Optional"
                        />
                    </Field>

                    {rows.map((row, index) => {
                        const sizePriceOptions = row.priceOptions ?? (row.size ? (row.variants || []).filter((v) => v.size === row.size && Number(v.current_stock_qty) > 0) : [])
                        const hasMultiplePrices = sizePriceOptions.length > 1
                        const hasSinglePrice = sizePriceOptions.length === 1
                        const effectiveSelectedVariant = row.selectedVariant || (hasSinglePrice ? sizePriceOptions[0] : null)
                        const availableStock = effectiveSelectedVariant ? Number(effectiveSelectedVariant.current_stock_qty ?? 0) : 0
                        return (
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
                                    {effectiveSelectedVariant && (
                                        <Badge
                                            alignSelf="flex-start"
                                            bg={availableStock > 0 ? 'gray.100' : 'red.50'}
                                            color={availableStock > 0 ? 'gray.700' : 'red.700'}
                                            px={3}
                                            py={1.5}
                                            borderRadius="full"
                                            fontSize="12px"
                                        >
                                            In stock: {availableStock}
                                        </Badge>
                                    )}
                                    <Field label="Item">
                                        <SelectDropdown
                                            inputRef={setRowRef(row.id, 'item')}
                                            options={items}
                                            value={row.itemName}
                                            onSelect={(opt) => handleItemSelect(row.id, opt)}
                                            disabled={isEditing}
                                            onCommit={() => focusRowField(row.id, 'size')}
                                            onFocus={() => handleFieldFocus(rowRefs.current[row.id]?.item ? { current: rowRefs.current[row.id].item } : null)}
                                            onBlur={handleFieldBlur}
                                            enterKeyHint="next"
                                            placeholder="Type to search item"
                                        />
                                    </Field>
                                    <Field label="Size">
                                        <SelectDropdown
                                            inputRef={setRowRef(row.id, 'size')}
                                            options={[...new Set(row.variants.map((variant) => variant.size))].map((size, idx) => ({ id: idx, name: size }))}
                                            value={row.size}
                                            onSelect={(opt) => handleSizeSelect(row.id, opt)}
                                            disabled={isEditing || !row.itemName}
                                            onCommit={() => focusRowField(row.id, 'quantity')}
                                            onFocus={() => handleFieldFocus(rowRefs.current[row.id]?.size ? { current: rowRefs.current[row.id].size } : null)}
                                            onBlur={handleFieldBlur}
                                            enterKeyHint="next"
                                            placeholder="Type to search size"
                                        />
                                    </Field>
                                    {row.size && !isEditing && hasMultiplePrices && (
                                        <Field label="Purchase price">
                                            <SelectDropdown
                                                inputRef={setRowRef(row.id, 'variantPrice')}
                                                options={sizePriceOptions.map((v) => ({ id: v.id, name: `${v.price}` }))}
                                                value={effectiveSelectedVariant ? `${effectiveSelectedVariant.price}` : ''}
                                                onSelect={(opt) => handlePriceSelect(row.id, sizePriceOptions.find((v) => v.id === opt.id))}
                                                onCommit={() => focusRowField(row.id, 'quantity')}
                                                enterKeyHint="next"
                                                placeholder="Select purchase price"
                                            />


                                        </Field>
                                    )}

                                    {row.size && (isEditing || hasSinglePrice) && effectiveSelectedVariant && (
                                        <Field label="Purchase price">
                                            <Input
                                                value={`${effectiveSelectedVariant.price}`}
                                                readOnly
                                                disabled
                                                {...fieldInputStyles}
                                                _disabled={{ bg: 'gray.100', color: 'gray.600', cursor: 'not-allowed' }}
                                            />
                                        </Field>
                                    )}

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
                                                        focusRowField(row.id, 'salePrice')
                                                    }
                                                }}
                                                enterKeyHint="next"
                                                placeholder="0"
                                                disabled={!effectiveSelectedVariant}
                                                {...fieldInputStyles}
                                                _disabled={{ bg: 'gray.100', color: 'gray.500', cursor: 'not-allowed' }}
                                            />
                                        </Field>
                                        <Field label="Price">
                                            <Input
                                                ref={setRowRef(row.id, 'salePrice')}
                                                type="number"
                                                inputMode="decimal"
                                                value={row.salePrice}
                                                onChange={(e) => updateRow(row.id, 'salePrice', e.target.value)}
                                                onFocus={() => handleFieldFocus(rowRefs.current[row.id]?.salePrice ? { current: rowRefs.current[row.id].salePrice } : null)}
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
                                </VStack>
                            </Box>
                        )
                    })}

                    {!isEditing && (
                        <Button
                            type="button"
                            onClick={handleAddRow}
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

export default SaleForm

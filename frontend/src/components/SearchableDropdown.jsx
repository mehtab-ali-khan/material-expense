import { useState, useRef, useEffect } from 'react'
import { Box, HStack, Input, VStack, Text } from '@chakra-ui/react'
import { PlusIcon, SearchIcon } from './Icons'

/**
 * A searchable select-or-create dropdown.
 *
 * - options: array of { id, name } (or any objects with a `name`-like field via `labelKey`)
 * - value: the currently typed/selected text
 * - onChange: called with the raw text as the user types
 * - onSelect: called with the full option object when an existing option is picked
 * - onCreate: called with the trimmed text when the user presses Enter on a new value
 */
function SearchableDropdown({
    options = [],
    value,
    onChange,
    onSelect,
    onCreate,
    placeholder,
    labelKey = 'name',
    inputRef,
    onCommit,
    onFocus,
    onBlur,
    enterKeyHint = 'next',
    type = 'text',
    inputMode,
}) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef(null)

    const filtered = options.filter((opt) =>
        opt[labelKey].toLowerCase().includes((value || '').toLowerCase())
    )

    const exactMatch = options.find(
        (opt) => opt[labelKey].toLowerCase() === (value || '').trim().toLowerCase()
    )

    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const commitSelection = async (callback) => {
        await callback()
        setIsOpen(false)
        window.setTimeout(() => onCommit?.(), 0)
    }

    const handleCreate = () => {
        const trimmed = (value || '').trim()
        if (!trimmed || exactMatch) return
        commitSelection(() => onCreate(trimmed))
    }

    const handleKeyDown = (e) => {
        if (e.key !== 'Enter') return
        e.preventDefault()
        const trimmed = (value || '').trim()
        if (!trimmed) return

        if (exactMatch) {
            commitSelection(() => onSelect(exactMatch))
        } else {
            handleCreate()
        }
    }

    const handlePick = (opt) => {
        commitSelection(() => onSelect(opt))
    }

    return (
        <Box position="relative" ref={containerRef} w="100%">
            <Input
                ref={inputRef}
                type={type}
                inputMode={inputMode}
                value={value || ''}
                onChange={(e) => {
                    onChange(e.target.value)
                    setIsOpen(true)
                }}
                onFocus={() => {
                    setIsOpen(true)
                    onFocus?.()
                }}
                onBlur={onBlur}
                onKeyDown={handleKeyDown}
                enterKeyHint={enterKeyHint}
                placeholder={placeholder || 'Type to search'}
                bg="white"
                border="1px solid"
                borderColor="gray.300"
                color="black"
                _placeholder={{ color: 'gray.400' }}
                _hover={{ borderColor: 'gray.400' }}
                _focus={{ borderColor: 'black', boxShadow: '0 0 0 1px black' }}
                borderRadius="xl"
                minH="54px"
                fontSize="16px"
            />

            {isOpen && (filtered.length > 0 || (value || '').trim().length > 0) && (
                <Box
                    position="absolute"
                    top="calc(100% + 4px)"
                    left={0}
                    right={0}
                    bg="white"
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="xl"
                    boxShadow="0 8px 24px rgba(0,0,0,0.12)"
                    maxH="180px"
                    overflowY="auto"
                    zIndex={60}
                    className="styled-scrollbar"
                >
                    <VStack gap={0} align="stretch">
                        <HStack px={4} py={3} minH="52px" color="gray.500" borderBottom="1px solid" borderColor="gray.100">
                            <SearchIcon size={16} />
                            <Text fontSize="sm">Choose existing or add new</Text>
                        </HStack>
                        {filtered.length > 0 ? (
                            filtered.map((opt) => (
                                <Box
                                    as="button"
                                    type="button"
                                    key={opt.id}
                                    px={4}
                                    py={3}
                                    minH="52px"
                                    textAlign="left"
                                    cursor="pointer"
                                    _hover={{ bg: 'gray.50' }}
                                    onClick={() => handlePick(opt)}
                                >
                                    <Text color="black" fontSize="16px">{opt[labelKey]}</Text>
                                </Box>
                            ))
                        ) : null}
                        {(value || '').trim().length > 0 && !exactMatch && (
                            <HStack
                                as="button"
                                type="button"
                                px={4}
                                py={3}
                                minH="52px"
                                textAlign="left"
                                color="black"
                                bg="green.50"
                                borderTop="1px solid"
                                borderColor="green.100"
                                _hover={{ bg: 'green.100' }}
                                onClick={handleCreate}
                            >
                                <PlusIcon size={16} />
                                <Text fontSize="16px" fontWeight="semibold">Add new: {(value || '').trim()}</Text>
                            </HStack>
                        )}
                    </VStack>
                </Box>
            )}
        </Box>
    )
}

export default SearchableDropdown

import { useState, useRef, useEffect } from 'react'
import { Box, Input, VStack, Text } from '@chakra-ui/react'

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

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            const trimmed = (value || '').trim()
            if (!trimmed) return

            if (exactMatch) {
                onSelect(exactMatch)
            } else {
                onCreate(trimmed)
            }
            setIsOpen(false)
        }
    }

    const handlePick = (opt) => {
        onSelect(opt)
        setIsOpen(false)
    }

    return (
        <Box position="relative" ref={containerRef} w="100%">
            <Input
                value={value || ''}
                onChange={(e) => {
                    onChange(e.target.value)
                    setIsOpen(true)
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                bg="white"
                border="1px solid"
                borderColor="gray.300"
                color="black"
                _placeholder={{ color: 'gray.400' }}
                _hover={{ borderColor: 'gray.400' }}
                _focus={{ borderColor: 'black', boxShadow: '0 0 0 1px black' }}
                size="lg"
                borderRadius="lg"
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
                    borderRadius="lg"
                    boxShadow="0 8px 24px rgba(0,0,0,0.1)"
                    maxH="200px"
                    overflowY="auto"
                    zIndex={20}
                >
                    <VStack gap={0} align="stretch">
                        {filtered.length > 0 ? (
                            filtered.map((opt) => (
                                <Box
                                    key={opt.id}
                                    px={4}
                                    py={2.5}
                                    cursor="pointer"
                                    _hover={{ bg: 'gray.50' }}
                                    onClick={() => handlePick(opt)}
                                >
                                    <Text color="black" fontSize="sm">{opt[labelKey]}</Text>
                                </Box>
                            ))
                        ) : (
                            <Box px={4} py={2.5}>
                                <Text color="gray.500" fontSize="sm">
                                    Press Enter to create "{(value || '').trim()}"
                                </Text>
                            </Box>
                        )}
                    </VStack>
                </Box>
            )}
        </Box>
    )
}

export default SearchableDropdown
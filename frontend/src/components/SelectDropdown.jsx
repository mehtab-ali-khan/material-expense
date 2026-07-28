import { useState, useRef, useEffect } from 'react'
import { Box, HStack, Input, VStack, Text } from '@chakra-ui/react'
import { SearchIcon } from './Icons'

/**
 * A select-only searchable dropdown — user can type to filter,
 * but can only pick from existing options. No create-new capability.
 */
function SelectDropdown({
    options = [],
    value,
    onSelect,
    placeholder,
    labelKey = 'name',
    disabled = false,
    inputRef,
    onCommit,
    onFocus,
    onBlur,
    enterKeyHint = 'next',
}) {
    const [query, setQuery] = useState(value || '')
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef(null)

    useEffect(() => {
        setQuery(value || '')
    }, [value])

    const filtered = options.filter((opt) =>
        opt[labelKey].toLowerCase().includes(query.toLowerCase())
    )

    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false)
                setQuery(value || '') // snap back if nothing valid was picked
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [value])

    const handlePick = async (opt) => {
        setQuery(opt[labelKey])
        await onSelect(opt)
        setIsOpen(false)
        window.setTimeout(() => onCommit?.(), 0)
    }

    return (
        <Box position="relative" ref={containerRef} w="100%">
            <Input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value)
                    setIsOpen(true)
                }}
                onFocus={() => {
                    setIsOpen(true)
                    onFocus?.()
                }}
                onBlur={onBlur}
                enterKeyHint={enterKeyHint}
                placeholder={placeholder}
                disabled={disabled}
                readOnly={disabled}
                bg="white"
                border="1px solid"
                borderColor="gray.300"
                color="black"
                _placeholder={{ color: 'gray.400' }}
                _hover={{ borderColor: disabled ? 'gray.300' : 'gray.400' }}
                _focus={{ borderColor: 'black', boxShadow: '0 0 0 1px black' }}
                _disabled={{ bg: 'gray.50', cursor: 'not-allowed' }}
                borderRadius="xl"
                minH="54px"
                fontSize="16px"
            />

            {isOpen && !disabled && (
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
                            <Text fontSize="sm">Type to search</Text>
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
                        ) : (
                            <Box px={4} py={3} minH="52px">
                                <Text color="gray.500" fontSize="sm">No matches found</Text>
                            </Box>
                        )}
                    </VStack>
                </Box>
            )}
        </Box>
    )
}

export default SelectDropdown

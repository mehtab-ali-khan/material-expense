import { useEffect, useRef, useState } from 'react'
import { Box, HStack, Text, VStack } from '@chakra-ui/react'
import { SearchIcon, UserIcon, XIcon } from './Icons'

function FilterDropdown({
    options = [],
    value = '',
    onChange,
    placeholder = 'Filter',
    label = 'Filter',
    labelKey = 'name',
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [query, setQuery] = useState('')
    const containerRef = useRef(null)
    const selected = options.find((opt) => String(opt.id) === String(value))
    const isFiltered = !!selected
    const filtered = options.filter((opt) =>
        opt[labelKey].toLowerCase().includes(query.trim().toLowerCase())
    )

    useEffect(() => {
        if (!isOpen) setQuery('')
    }, [isOpen])

    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleClear = (e) => {
        e.stopPropagation()
        onChange('')
        setIsOpen(false)
    }

    return (
        <Box ref={containerRef} position="relative" minW={{ base: '148px', sm: '168px' }} flex={{ base: '1 1 148px', sm: '0 0 auto' }}>
            <HStack
                as="button"
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                w="100%"
                px={3}
                py={2}
                minH="38px"
                border="1px solid"
                borderColor={isFiltered ? 'black' : 'gray.200'}
                borderRadius="full"
                bg={isFiltered ? 'black' : 'white'}
                color={isFiltered ? 'white' : 'black'}
                fontSize="13px"
                fontWeight="medium"
                gap={1.5}
            >
                <UserIcon size={15} />
                <Text
                    fontSize="13px"
                    fontWeight="semibold"
                    minW={0}
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                    flex="1"
                    textAlign="left"
                >
                    {selected?.[labelKey] || placeholder}
                </Text>
                {isFiltered && (
                    <Box
                        as="span"
                        role="button"
                        aria-label={`Clear ${label.toLowerCase()} filter`}
                        onClick={handleClear}
                        display="flex"
                        alignItems="center"
                        ml={1}
                        pl={1.5}
                        borderLeft="1px solid"
                        borderColor="whiteAlpha.400"
                    >
                        <XIcon size={13} />
                    </Box>
                )}
            </HStack>

            {isOpen && (
                <Box
                    position="absolute"
                    top="calc(100% + 6px)"
                    left={0}
                    right={0}
                    minW="220px"
                    bg="white"
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="xl"
                    boxShadow="0 8px 24px rgba(0,0,0,0.12)"
                    overflow="hidden"
                    zIndex={70}
                >
                    <HStack px={3} py={2.5} minH="42px" borderBottom="1px solid" borderColor="gray.100" color="gray.500">
                        <SearchIcon size={15} />
                        <Box
                            as="input"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={`Search ${label.toLowerCase()}`}
                            autoFocus
                            style={{
                                width: '100%',
                                border: 0,
                                outline: 0,
                                fontSize: '14px',
                                color: 'black',
                                background: 'transparent',
                            }}
                        />
                    </HStack>
                    <VStack gap={0} align="stretch" maxH="220px" overflowY="auto" className="styled-scrollbar">
                        {isFiltered && (
                            <Box
                                as="button"
                                type="button"
                                px={3}
                                py={3}
                                textAlign="left"
                                borderBottom="1px solid"
                                borderColor="gray.100"
                                _hover={{ bg: 'gray.50' }}
                                onClick={() => {
                                    onChange('')
                                    setIsOpen(false)
                                }}
                            >
                                <Text color="black" fontSize="14px" fontWeight="semibold">All salesmen</Text>
                            </Box>
                        )}
                        {filtered.length > 0 ? filtered.map((opt) => (
                            <Box
                                as="button"
                                type="button"
                                key={opt.id}
                                px={3}
                                py={3}
                                minH="46px"
                                textAlign="left"
                                bg={String(opt.id) === String(value) ? 'gray.50' : 'white'}
                                _hover={{ bg: 'gray.50' }}
                                onClick={() => {
                                    onChange(opt.id)
                                    setIsOpen(false)
                                }}
                            >
                                <Text color="black" fontSize="15px" fontWeight={String(opt.id) === String(value) ? 'semibold' : 'medium'}>
                                    {opt[labelKey]}
                                </Text>
                            </Box>
                        )) : (
                            <Box px={3} py={3} minH="46px">
                                <Text color="gray.500" fontSize="14px">No matches found</Text>
                            </Box>
                        )}
                    </VStack>
                </Box>
            )}
        </Box>
    )
}

export default FilterDropdown

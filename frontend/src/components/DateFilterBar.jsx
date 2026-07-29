import { useState, useRef, useEffect } from 'react'
import { Box, HStack, Input, Text } from '@chakra-ui/react'
import { CalendarIcon, XIcon, CheckIcon } from './Icons'

const formatLabel = (dateStr) => {
    if (!dateStr) return 'All dates'
    const parsed = new Date(`${dateStr}T00:00:00`)
    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function DateFilterBar({ value, onChange }) {
    const [isOpen, setIsOpen] = useState(false)
    const [draft, setDraft] = useState(value || '')
    const containerRef = useRef(null)

    // keep draft in sync when the applied value changes externally (e.g. cleared)
    useEffect(() => {
        setDraft(value || '')
    }, [value])

    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false)
                setDraft(value || '') // discard unapplied draft
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [value])

    const isFiltered = !!value

    const handleOpen = () => {
        setDraft(value || '')
        setIsOpen((o) => !o)
    }

    const handleApply = () => {
        if (draft) {
            onChange(draft)
        }
        setIsOpen(false)
    }

    const handleClear = () => {
        onChange('')
        setDraft('')
        setIsOpen(false)
    }

    return (
        <Box position="relative" ref={containerRef} mb={3}>
            <HStack
                as="button"
                type="button"
                onClick={handleOpen}
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
                <CalendarIcon size={15} />
                <Text fontSize="13px" fontWeight="semibold">
                    {formatLabel(value)}
                </Text>
            </HStack>

            {isFiltered && (
                <Box
                    as="button"
                    type="button"
                    position="absolute"
                    top="8px"
                    left="125px"
                    w="20px"
                    h="20px"
                    borderRadius="full"
                    bg="white"
                    border="1px solid"
                    borderColor="gray.300"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    onClick={(e) => {
                        e.stopPropagation()
                        handleClear()
                    }}
                >
                    <XIcon size={11} />
                </Box>
            )}

            {isOpen && (
                <Box
                    position="absolute"
                    top="calc(100% + 6px)"
                    left={0}
                    bg="white"
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="xl"
                    boxShadow="0 8px 24px rgba(0,0,0,0.12)"
                    p={3}
                    zIndex={60}
                    minW="240px"
                >
                    <Text fontSize="12px" color="gray.500" fontWeight="semibold" mb={2}>
                        Pick a date
                    </Text>
                    <Input
                        type="date"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        bg="white"
                        border="1px solid"
                        borderColor="gray.300"
                        color="black"
                        borderRadius="lg"
                        minH="44px"
                        fontSize="15px"
                        mb={2}
                    />
                    <HStack gap={2}>
                        <Box
                            as="button"
                            type="button"
                            flex="1"
                            py={2}
                            borderRadius="lg"
                            bg="black"
                            color="white"
                            fontSize="13px"
                            fontWeight="semibold"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            gap={1}
                            disabled={!draft}
                            opacity={!draft ? 0.4 : 1}
                            onClick={handleApply}
                        >
                            <CheckIcon size={14} />
                            Apply
                        </Box>
                        {isFiltered && (
                            <Box
                                as="button"
                                type="button"
                                flex="1"
                                py={2}
                                borderRadius="lg"
                                bg="gray.50"
                                color="black"
                                fontSize="13px"
                                fontWeight="semibold"
                                onClick={handleClear}
                            >
                                Show all
                            </Box>
                        )}
                    </HStack>
                </Box>
            )}
        </Box>
    )
}

export default DateFilterBar
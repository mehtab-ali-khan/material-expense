import { useState, useRef, useEffect } from 'react'
import { Box, HStack, Input, Text } from '@chakra-ui/react'
import { CalendarIcon, XIcon } from './Icons'

const formatLabel = (dateStr) => {
    if (!dateStr) return 'All dates'
    const parsed = new Date(`${dateStr}T00:00:00`)
    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function DateFilterBar({ value, onChange }) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef(null)

    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const isFiltered = !!value

    return (
        <Box position="relative" ref={containerRef} mb={3}>
            <HStack
                as="button"
                type="button"
                onClick={() => setIsOpen((o) => !o)}
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
                <Text mt="2px" fontSize="13px" fontWeight="semibold">
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
                        onChange('')
                        setIsOpen(false)
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
                    minW="220px"
                >
                    <Text fontSize="12px" color="gray.500" fontWeight="semibold" mb={2}>
                        Pick a date
                    </Text>
                    <Input
                        type="date"
                        value={value}
                        onChange={(e) => {
                            onChange(e.target.value)
                            setIsOpen(false)
                        }}
                        autoFocus
                        bg="white"
                        border="1px solid"
                        borderColor="gray.300"
                        color="black"
                        borderRadius="lg"
                        minH="44px"
                        fontSize="15px"
                    />
                    {isFiltered && (
                        <Box
                            as="button"
                            type="button"
                            mt={2}
                            w="100%"
                            py={2}
                            borderRadius="lg"
                            bg="gray.50"
                            color="black"
                            fontSize="13px"
                            fontWeight="semibold"
                            onClick={() => {
                                onChange('')
                                setIsOpen(false)
                            }}
                        >
                            Show all dates
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    )
}

export default DateFilterBar
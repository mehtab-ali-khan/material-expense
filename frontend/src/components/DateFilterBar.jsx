import { useRef } from 'react'
import { Box, HStack, Input, Text } from '@chakra-ui/react'
import { CalendarIcon, XIcon } from './Icons'

const formatLabel = (dateStr) => {
    if (!dateStr) return 'All dates'
    const parsed = new Date(`${dateStr}T00:00:00`)
    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function DateFilterBar({ value, onChange }) {
    const inputRef = useRef(null)
    const isFiltered = !!value

    const openPicker = () => {
        if (inputRef.current?.showPicker) {
            inputRef.current.showPicker()
        } else {
            inputRef.current?.focus()
        }
    }

    const handleDateChange = (e) => {
        onChange(e.target.value)
    }

    const handleClear = (e) => {
        e.stopPropagation()
        onChange('')
    }

    return (
        <Box position="relative" mb={3} display="inline-block">
            <HStack
                as="button"
                type="button"
                onClick={openPicker}
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
                {isFiltered && (
                    <Box
                        as="span"
                        role="button"
                        aria-label="Clear date filter"
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

            {/* hidden native date input, triggered programmatically via showPicker() */}
            <Input
                ref={inputRef}
                type="date"
                value={value || ''}
                onChange={handleDateChange}
                position="absolute"
                top={0}
                left={0}
                w="1px"
                h="1px"
                opacity={0}
                pointerEvents="none"
            />
        </Box>
    )
}

export default DateFilterBar
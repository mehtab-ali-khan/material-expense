import { Box, Input } from '@chakra-ui/react'
import { SearchIcon } from './Icons'

function SearchBar({ value, onChange, placeholder = 'Search' }) {
    return (
        <Box position="relative" flex="1">
            <Box
                position="absolute"
                left="12px"
                top="50%"
                transform="translateY(-50%)"
                color="black.400"
                pointerEvents="none"
                zIndex={1}
            >
                <SearchIcon size={16} />
            </Box>
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                pl="36px"
                bg="white"
                border="1px solid"
                borderColor="gray.200"
                color="black"
                _placeholder={{ color: 'gray.400' }}
                _hover={{ borderColor: 'gray.300' }}
                outline="none"
                _focus={{ borderColor: 'gray.200', boxShadow: 'none', outline: 'none' }}
                _focusVisible={{ borderColor: 'gray.200', boxShadow: 'none', outline: 'none' }}
                _focusWithin={{ borderColor: 'gray.200', boxShadow: 'none', outline: 'none' }}
                borderRadius="full"
                minH="38px"
                fontSize="13px"
            />
        </Box>
    )
}

export default SearchBar
import { HStack, Text } from '@chakra-ui/react'
import { AlertIcon } from './Icons'

function FormMessage({ tone = 'error', children }) {
    const isError = tone === 'error'

    return (
        <HStack
            bg={isError ? 'red.50' : 'white'}
            border="1px solid"
            borderColor={isError ? 'red.200' : 'gray.200'}
            borderRadius="xl"
            color={isError ? 'red.700' : 'gray.700'}
            px={3}
            py={3}
            minH="48px"
            align="start"
        >
            <AlertIcon size={18} />
            <Text fontSize="16px">{children}</Text>
        </HStack>
    )
}

export default FormMessage

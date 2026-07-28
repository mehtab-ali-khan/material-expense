import { useEffect } from 'react'
import { Box, Text } from '@chakra-ui/react'

function ToastMessage({ message, onDone }) {
    useEffect(() => {
        if (!message) return
        const timer = window.setTimeout(() => onDone?.(), 1800)
        return () => window.clearTimeout(timer)
    }, [message, onDone])

    if (!message) return null

    return (
        <Box
            position="fixed"
            left="50%"
            bottom="calc(84px + env(safe-area-inset-bottom))"
            transform="translateX(-50%)"
            bg="black"
            color="white"
            borderRadius="full"
            px={4}
            py={2.5}
            zIndex={80}
            boxShadow="0 8px 24px rgba(0,0,0,0.22)"
        >
            <Text fontSize="14px" fontWeight="medium" whiteSpace="nowrap">
                {message}
            </Text>
        </Box>
    )
}

export default ToastMessage

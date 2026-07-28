import { Box, VStack, Heading, Text } from '@chakra-ui/react'

function AuthLayout({ title, subtitle, children }) {
    return (
        <Box
            minH="100dvh"
            w="100%"
            bg="gray.50"
            px={4}
            pt="calc(56px + env(safe-area-inset-top))"
            pb="calc(24px + env(safe-area-inset-bottom))"
        >
            <Box
                w="100%"
                maxW="420px"
                mx="auto"
            >
                <VStack gap={1} mb={8} align="stretch">
                    <Heading fontSize="30px" lineHeight="1.1" color="black" letterSpacing="tight">
                        {title}
                    </Heading>
                    {subtitle && (
                        <Text color="gray.500" fontSize="15px">
                            {subtitle}
                        </Text>
                    )}
                </VStack>
                {children}
            </Box>
        </Box>
    )
}

export default AuthLayout

import { Box, Center, VStack, Heading, Text } from '@chakra-ui/react'

function AuthLayout({ title, subtitle, children }) {
    return (
        <Box
            minH="100vh"
            w="100%"
            bg="gray.50"
            display="flex"
            alignItems="center"
            justifyContent="center"
            px={4}
            py={8}
        >
            <Box
                w="100%"
                maxW="380px"
                bg="white"
                border="1px solid"
                borderColor="gray.200"
                borderRadius="2xl"
                boxShadow="0 4px 24px rgba(0,0,0,0.06)"
                p={{ base: 6, sm: 8 }}
            >
                <VStack gap={1} mb={7} align="stretch">
                    <Heading size="lg" textAlign="center" color="black" letterSpacing="tight">
                        {title}
                    </Heading>
                    {subtitle && (
                        <Text textAlign="center" color="gray.500" fontSize="sm">
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
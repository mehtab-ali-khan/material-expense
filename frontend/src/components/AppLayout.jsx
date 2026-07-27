import { Box } from '@chakra-ui/react'

function AppLayout({ children }) {
    return (
        <Box minH="100vh" bg="gray.50">
            {children}
        </Box>
    )
}

export default AppLayout
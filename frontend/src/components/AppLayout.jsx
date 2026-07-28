import { Box } from '@chakra-ui/react'
import NavBar from './NavBar'

function AppLayout({ children }) {
    return (
        <Box minH="100vh" bg="gray.50">
            <NavBar />
            <Box
                ml={{ base: 0, md: '220px' }}
                pt={{ base: '60px', md: 0 }}
                pb={{ base: '80px', md: 0 }}
            >
                {children}
            </Box>
        </Box>
    )
}

export default AppLayout
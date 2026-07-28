import { Box } from '@chakra-ui/react'
import NavBar from './NavBar'

function AppLayout({ children, hideBottomNav = false }) {
    return (
        <Box minH="100dvh" bg="gray.50">
            <NavBar hideBottomNav={hideBottomNav} />
            <Box
                ml={{ base: 0, md: '220px' }}
                pt={0}
                pb={{
                    base: hideBottomNav ? 0 : 'calc(84px + env(safe-area-inset-bottom))',
                    md: 0,
                }}
            >
                {children}
            </Box>
        </Box>
    )
}

export default AppLayout

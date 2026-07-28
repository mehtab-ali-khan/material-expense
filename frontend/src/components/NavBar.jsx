import { Box, HStack, VStack, Text } from '@chakra-ui/react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const icons = {
    purchase: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    ),
    sale: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
        </svg>
    ),
    stock: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
        </svg>
    ),
    profit: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
        </svg>
    ),
}

const navItems = [
    { to: '/purchase', label: 'Purchase', key: 'purchase' },
    { to: '/sale', label: 'Sale', key: 'sale' },
    { to: '/stock', label: 'Stock', key: 'stock' },
    { to: '/profit', label: 'Profit', key: 'profit' },
]

function NavBar() {
    const { companyName, logout } = useAuth()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <>
            {/* Desktop sidebar */}
            <Box
                display={{ base: 'none', md: 'flex' }}
                flexDir="column"
                w="220px"
                h="100vh"
                bg="white"
                borderRight="1px solid"
                borderColor="gray.200"
                position="fixed"
                left={0}
                top={0}
                px={4}
                py={6}
            >
                <Text fontWeight="bold" fontSize="lg" color="black" mb={1} px={2}>
                    {companyName}
                </Text>
                <Text fontSize="xs" color="gray.400" mb={6} px={2}>
                    Inventory Manager
                </Text>

                <VStack align="stretch" gap={1}>
                    {navItems.map((item) => (
                        <NavLink key={item.to} to={item.to}>
                            {({ isActive }) => (
                                <HStack
                                    px={3}
                                    py={2.5}
                                    borderRadius="lg"
                                    bg={isActive ? 'gray.100' : 'transparent'}
                                    color={isActive ? 'black' : 'gray.600'}
                                    fontWeight={isActive ? 'semibold' : 'medium'}
                                    _hover={{ bg: isActive ? 'gray.100' : 'gray.50' }}
                                >
                                    <Box display="flex" alignItems="center">{icons[item.key]}</Box>
                                    <Text fontSize="sm" fontWeight={isActive ? 'semibold' : 'medium'}>{item.label}</Text>
                                </HStack>
                            )}
                        </NavLink>
                    ))}
                </VStack>

                <Box mt="auto">
                    <HStack
                        px={3}
                        py={2.5}
                        borderRadius="lg"
                        cursor="pointer"
                        color="gray.600"
                        _hover={{ bg: 'gray.50', color: 'black' }}
                        onClick={handleLogout}
                    >
                        <Box
                            w="18px"
                            h="18px"
                            flexShrink={0}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                        </Box>
                        <Text fontSize="sm" fontWeight="medium">Log Out</Text>
                    </HStack>
                </Box>
            </Box>
            {/* Mobile top bar */}
            <Box
                display={{ base: 'flex', md: 'none' }}
                position="fixed"
                top={0}
                left={0}
                right={0}
                bg="white"
                borderBottom="1px solid"
                borderColor="gray.200"
                justifyContent="space-between"
                alignItems="center"
                px={4}
                py={3}
                zIndex={30}
            >
                <Text fontWeight="semibold" color="black" fontSize="sm">
                    {companyName}
                </Text>
                <Box
                    as="button"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    color="gray.600"
                    onClick={handleLogout}
                    p={1}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                </Box>
            </Box>

            {/* Mobile bottom tab bar */}
            <Box
                display={{ base: 'flex', md: 'none' }}
                position="fixed"
                bottom={0}
                left={0}
                right={0}
                bg="white"
                borderTop="1px solid"
                borderColor="gray.200"
                justifyContent="space-around"
                py={2}
                zIndex={30}
            >
                {navItems.map((item) => (
                    <NavLink key={item.to} to={item.to} style={{ flex: 1 }}>
                        {({ isActive }) => (
                            <VStack
                                gap={0.5}
                                py={1.5}
                                px={2}
                                borderRadius="lg"
                                bg={isActive ? 'gray.100' : 'transparent'}
                                color={isActive ? 'black' : 'gray.400'}
                            >
                                <Box display="flex" alignItems="center" justifyContent="center">{icons[item.key]}</Box>
                                <Text fontSize="10px" fontWeight={isActive ? 'semibold' : 'medium'}>{item.label}</Text>
                            </VStack>
                        )}
                    </NavLink>
                ))}
            </Box>
        </>
    )
}

export default NavBar
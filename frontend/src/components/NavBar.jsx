import { Box, HStack, VStack, Text } from '@chakra-ui/react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ArrowUpRightIcon, PackageIcon, PlusIcon, TrendingUpIcon, UserIcon } from './Icons'

const icons = {
    purchase: <PlusIcon />,
    sale: <ArrowUpRightIcon />,
    stock: <PackageIcon />,
    profit: <TrendingUpIcon />,
    account: <UserIcon />,
}

const navItems = [
    { to: '/purchase', label: 'Purchase', key: 'purchase' },
    { to: '/sale', label: 'Sale', key: 'sale' },
    { to: '/stock', label: 'Stock', key: 'stock' },
    { to: '/profit', label: 'Profit', key: 'profit' },
    { to: '/account', label: 'Account', key: 'account' },
]

function NavBar({ hideBottomNav = false }) {
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
            {/* Mobile bottom tab bar */}
            {!hideBottomNav && <Box
                display={{ base: 'flex', md: 'none' }}
                position="fixed"
                bottom={0}
                left={0}
                right={0}
                bg="white"
                borderTop="1px solid"
                borderColor="gray.200"
                justifyContent="space-around"
                pt={2}
                pb="calc(8px + env(safe-area-inset-bottom))"
                zIndex={30}
            >
                {navItems.map((item) => (
                    <NavLink key={item.to} to={item.to} style={{ flex: 1 }}>
                        {({ isActive }) => (
                            <VStack
                                gap={0.5}
                                py={1}
                                px={2}
                                minH="48px"
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
            </Box>}
        </>
    )
}

export default NavBar

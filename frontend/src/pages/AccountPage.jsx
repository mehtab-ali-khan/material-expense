import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { LogOutIcon } from '../components/Icons'
import { useAuth } from '../context/AuthContext'
import { formatPhoneDisplay } from '../utils/phone'


function AccountPage() {
    const { companyName, profile, logout } = useAuth()
    const navigate = useNavigate()
    const { firstName, lastName, phone } = profile

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <AppLayout>
            <Box
                px={4}
                pt="calc(16px + env(safe-area-inset-top))"
                pb="calc(88px + env(safe-area-inset-bottom))"
            >
                <Heading fontSize="24px" lineHeight="1.1" color="black" mb={4}>
                    Account
                </Heading>

                <Box bg="white" border="1px solid" borderColor="gray.100" borderRadius="xl" px={4} py={4}>
                    <VStack align="stretch" gap={4}>
                        <ProfileRow label="Name" value={`${firstName} ${lastName}`.trim() || 'Not added'} />
                        <ProfileRow label="Phone" value={formatPhoneDisplay(phone) || 'Not added'} />
                        <Box>
                            <Text fontSize="12px" color="gray.500" fontWeight="semibold">
                                Company
                            </Text>
                            <Text fontSize="18px" color="black" fontWeight="semibold">
                                {companyName}
                            </Text>
                        </Box>

                        <Button
                            minH="52px"
                            borderRadius="xl"
                            bg="black"
                            color="white"
                            fontWeight="semibold"
                            _hover={{ bg: 'gray.800' }}
                            onClick={handleLogout}
                        >
                            <LogOutIcon />
                            Log out
                        </Button>
                    </VStack>
                </Box>
            </Box>
        </AppLayout>
    )
}

function ProfileRow({ label, value }) {
    return (
        <Box>
            <Text fontSize="12px" color="gray.500" fontWeight="semibold">
                {label}
            </Text>
            <Text fontSize="16px" color="black" fontWeight="medium">
                {value}
            </Text>
        </Box>
    )
}

export default AccountPage

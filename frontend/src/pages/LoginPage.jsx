import { useState } from 'react'
import { Box, Button, Input, Stack, Text, Link as ChakraLink, Field } from '@chakra-ui/react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { login } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'

const inputStyles = {
    bg: 'white',
    border: '1px solid',
    borderColor: 'gray.300',
    color: 'black',
    _placeholder: { color: 'gray.400' },
    _hover: { borderColor: 'gray.400' },
    _focus: { borderColor: 'black', boxShadow: '0 0 0 1px black' },
    size: 'lg',
    borderRadius: 'full',
}

function LoginPage() {
    const [name, setName] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const { loginSuccess } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const res = await login(name, password)
            loginSuccess(res.data.token, res.data.company_name)
            navigate('/purchase')
        } catch (err) {
            setError('Invalid company name or password.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthLayout title="Welcome back" subtitle="Log in to manage your inventory">
            <form onSubmit={handleSubmit}>
                <Stack gap={4}>
                    <Field.Root>
                        <Input
                            placeholder="Company name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            {...inputStyles}
                        />
                    </Field.Root>
                    <Field.Root>
                        <Input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            {...inputStyles}
                        />
                    </Field.Root>

                    {error && (
                        <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="lg" px={3} py={2}>
                            <Text color="red.600" fontSize="sm">{error}</Text>
                        </Box>
                    )}

                    <Button
                        type="submit"
                        loading={loading}
                        w="full"
                        size="lg"
                        borderRadius="full"
                        bg="black"
                        color="white"
                        fontWeight="semibold"
                        _hover={{ bg: 'gray.800' }}
                        mt={2}
                    >
                        Log In
                    </Button>
                </Stack>
            </form>

            <Text mt={6} textAlign="center" fontSize="sm" color="gray.500">
                No account?{' '}
                <ChakraLink as={RouterLink} to="/signup" color="black" fontWeight="semibold">
                    Sign up
                </ChakraLink>
            </Text>
        </AuthLayout>
    )
}

export default LoginPage
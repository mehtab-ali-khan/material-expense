import { useState } from 'react'
import { Button, Input, Stack, Text, Link as ChakraLink, Field } from '@chakra-ui/react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { login } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'
import { ArrowUpRightIcon } from '../components/Icons'
import FormMessage from '../components/FormMessage'

const inputStyles = {
    bg: 'white',
    border: '1px solid',
    borderColor: 'gray.300',
    color: 'black',
    _placeholder: { color: 'gray.400' },
    _hover: { borderColor: 'gray.400' },
    _focus: { borderColor: 'black', boxShadow: '0 0 0 1px black' },
    borderRadius: 'xl',
    minH: '54px',
    fontSize: '16px',
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
        } catch {
            setError('Invalid company name or password.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthLayout title="Login" subtitle="Manage purchases, sales, stock and profit.">
            <form onSubmit={handleSubmit}>
                <Stack gap={4}>
                    <Field.Root>
                        <Input
                            placeholder="Company name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoComplete="organization"
                            enterKeyHint="next"
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
                            autoComplete="current-password"
                            enterKeyHint="done"
                            required
                            {...inputStyles}
                        />
                    </Field.Root>

                    {error && (
                        <FormMessage tone="error">{error}</FormMessage>
                    )}

                    <Button
                        type="submit"
                        loading={loading}
                        w="full"
                        minH="54px"
                        borderRadius="xl"
                        bg="black"
                        color="white"
                        fontWeight="semibold"
                        _hover={{ bg: 'gray.800' }}
                    >
                        <ArrowUpRightIcon />
                        Login
                    </Button>
                </Stack>
            </form>

            <Text mt={6} textAlign="center" fontSize="14px" color="gray.500">
                No account?{' '}
                <ChakraLink as={RouterLink} to="/signup" color="black" fontWeight="semibold">
                    Sign up
                </ChakraLink>
            </Text>
        </AuthLayout>
    )
}

export default LoginPage

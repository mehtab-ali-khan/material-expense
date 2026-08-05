import { useState } from 'react'
import { Button, Input, Stack, Text, Link as ChakraLink, Field, Box } from '@chakra-ui/react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { login } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'
import { ArrowUpRightIcon, EyeIcon, EyeOffIcon } from '../components/Icons'
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
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    const { loginSuccess } = useAuth()
    const navigate = useNavigate()
    const loginMutation = useMutation({
        mutationFn: () => login(phone, password),
        onSuccess: (res) => {
            loginSuccess(res.data.token, res.data)
            navigate('/purchase')
        },
        onError: () => {
            setError('Invalid company name or password.')
        },
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        loginMutation.mutate()
    }

    return (
        <AuthLayout title="Login" subtitle="Manage purchases, sales, stock and profit.">
            <form onSubmit={handleSubmit}>
                <Stack gap={4}>
                    <Field.Root>
                        <Input
                            type="tel"
                            inputMode="tel"
                            placeholder="Phone number"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            autoComplete="tel"
                            enterKeyHint="next"
                            required
                            {...inputStyles}
                        />
                    </Field.Root>
                    <Field.Root>
                        <Box position="relative" w="100%">
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                enterKeyHint="done"
                                required
                                pr="44px"
                                {...inputStyles}
                            />
                            <Box
                                as="button"
                                type="button"
                                position="absolute"
                                right="14px"
                                top="50%"
                                transform="translateY(-50%)"
                                color="gray.500"
                                onClick={() => setShowPassword((s) => !s)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                            </Box>
                        </Box>
                    </Field.Root>

                    {error && (
                        <FormMessage tone="error">{error}</FormMessage>
                    )}

                    <Button
                        type="submit"
                        loading={loginMutation.isPending}
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

import { useState } from 'react'
import { Button, Input, Stack, Text, Link as ChakraLink, Field, Box } from '@chakra-ui/react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { signup, login } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'
import { PlusIcon, EyeIcon, EyeOffIcon } from '../components/Icons'
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

function SignupPage() {
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [phone, setPhone] = useState('')
    const [name, setName] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const { loginSuccess } = useAuth()
    const navigate = useNavigate()
    const signupMutation = useMutation({
        mutationFn: async () => {
            await signup(name, password, firstName, lastName, phone)
            return login(phone, password)
        },
        onSuccess: (res) => {
            loginSuccess(res.data.token, res.data)
            navigate('/purchase')
        },
        onError: () => {
            setError('Could not sign up. Company name may already be taken.')
        },
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }
        signupMutation.mutate()
    }

    return (
        <AuthLayout title="Create company" subtitle="Start tracking your material expenses.">
            <form onSubmit={handleSubmit}>
                <Stack gap={4}>
                    <Field.Root>
                        <Input
                            placeholder="First name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            autoComplete="given-name"
                            enterKeyHint="next"
                            required
                            {...inputStyles}
                        />
                    </Field.Root>
                    <Field.Root>
                        <Input
                            placeholder="Last name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            autoComplete="family-name"
                            enterKeyHint="next"
                            required
                            {...inputStyles}
                        />
                    </Field.Root>
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
                    <Field.Root invalid={password.length > 0 && password.length < 8}>
                        <Box position="relative" w="100%">
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
                                enterKeyHint="done"
                                required
                                minLength={8}
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
                        <Field.ErrorText>Password must be at least 8 characters</Field.ErrorText>
                    </Field.Root>

                    <Field.Root invalid={confirmPassword.length > 0 && confirmPassword !== password}>
                        <Box position="relative" w="100%">
                            <Input
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="Confirm password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                autoComplete="new-password"
                                enterKeyHint="done"
                                required
                                minLength={8}
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
                                onClick={() => setShowConfirmPassword((s) => !s)}
                                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                                {showConfirmPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                            </Box>
                        </Box>
                        <Field.ErrorText>Passwords do not match</Field.ErrorText>
                    </Field.Root>

                    {error && (
                        <FormMessage tone="error">{error}</FormMessage>
                    )}

                    <Button
                        type="submit"
                        loading={signupMutation.isPending}
                        w="full"
                        minH="54px"
                        borderRadius="xl"
                        bg="black"
                        color="white"
                        fontWeight="semibold"
                        _hover={{ bg: 'gray.800' }}
                    >
                        <PlusIcon />
                        Sign up
                    </Button>
                </Stack>
            </form>

            <Text mt={6} textAlign="center" fontSize="14px" color="gray.500">
                Already have an account?{' '}
                <ChakraLink as={RouterLink} to="/login" color="black" fontWeight="semibold">
                    Log in
                </ChakraLink>
            </Text>
        </AuthLayout>
    )
}

export default SignupPage

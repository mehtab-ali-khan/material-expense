import { useState } from 'react'
import { Box, Button, Heading, Input, Stack, Text, Link as ChakraLink } from '@chakra-ui/react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { signup, login } from '../api/auth'
import { useAuth } from '../context/AuthContext'

function SignupPage() {
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
            await signup(name, password)
            const res = await login(name, password)
            loginSuccess(res.data.token, res.data.company_name)
            navigate('/purchase')
        } catch (err) {
            setError('Could not sign up. Company name may already be taken.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Box maxW="sm" mx="auto" mt={20} p={6}>
            <Heading size="lg" mb={6} textAlign="center">Create Company Account</Heading>
            <form onSubmit={handleSubmit}>
                <Stack gap={4}>
                    <Input
                        placeholder="Company name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                    <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    {error && <Text color="red.500" fontSize="sm">{error}</Text>}
                    <Button type="submit" loading={loading} w="full">
                        Sign Up
                    </Button>
                </Stack>
            </form>
            <Text mt={4} textAlign="center" fontSize="sm">
                Already have an account?{' '}
                <ChakraLink as={RouterLink} to="/login">Log in</ChakraLink>
            </Text>
        </Box>
    )
}

export default SignupPage
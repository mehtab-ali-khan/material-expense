import { useEffect, useState } from 'react'
import { Box, Button, Heading, Input, Stack, Text, VStack } from '@chakra-ui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import AppLayout from '../components/AppLayout'
import PageLoader from '../components/PageLoader'
import ToastMessage from '../components/ToastMessage'
import FormMessage from '../components/FormMessage'
import { SaveIcon } from '../components/Icons'
import { useAuth } from '../context/AuthContext'
import { updateMe } from '../api/auth'
import { queryKeys } from '../api/queryKeys'

const fieldInputStyles = {
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

function ProfilePage() {
    const { companyName, profile, updateProfile } = useAuth()
    const queryClient = useQueryClient()

    const [firstName, setFirstName] = useState(profile.firstName || '')
    const [lastName, setLastName] = useState(profile.lastName || '')
    const [phone, setPhone] = useState(profile.phone || '')
    const [name, setName] = useState(companyName || '')
    const [error, setError] = useState('')
    const [toast, setToast] = useState('')
    const updateProfileMutation = useMutation({
        mutationFn: updateMe,
        onSuccess: (res) => {
            updateProfile(res.data)
            queryClient.setQueryData(queryKeys.me, res.data)
            setToast('Profile updated')
        },
        onError: (err) => {
            const data = err.response?.data
            const detail =
                data?.phone?.[0] || data?.name?.[0] || data?.detail || null
            setError(detail || 'Could not save changes. Please check the values and try again.')
        },
    })

    // Resync local fields whenever the source of truth changes
    // (e.g. right after a successful save, or if profile loads late)
    useEffect(() => {
        setFirstName(profile.firstName || '')
        setLastName(profile.lastName || '')
        setPhone(profile.phone || '')
        setName(companyName || '')
    }, [profile.firstName, profile.lastName, profile.phone, companyName])

    const isDirty =
        firstName !== (profile.firstName || '') ||
        lastName !== (profile.lastName || '') ||
        phone !== (profile.phone || '') ||
        name !== (companyName || '')

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!isDirty) return
        setError('')

        if (!firstName.trim() || !lastName.trim() || !phone.trim() || !name.trim()) {
            setError('All fields are required.')
            return
        }

        updateProfileMutation.mutate({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim(),
            name: name.trim(),
        })
    }

    if (!profile) return <PageLoader />

    return (
        <AppLayout>
            <Box
                px={4}
                pt="calc(16px + env(safe-area-inset-top))"
                pb="calc(88px + env(safe-area-inset-bottom))"
            >
                <Heading fontSize="24px" lineHeight="1.1" color="black" mb={4}>
                    Profile
                </Heading>

                <form onSubmit={handleSubmit} noValidate>
                    <VStack gap={3} align="stretch">
                        <Field label="First name">
                            <Input
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                enterKeyHint="next"
                                {...fieldInputStyles}
                            />
                        </Field>

                        <Field label="Last name">
                            <Input
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                enterKeyHint="next"
                                {...fieldInputStyles}
                            />
                        </Field>

                        <Field label="Phone">
                            <Input
                                type="tel"
                                inputMode="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                enterKeyHint="next"
                                {...fieldInputStyles}
                            />
                        </Field>

                        <Field label="Company">
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                enterKeyHint="done"
                                {...fieldInputStyles}
                            />
                        </Field>

                        {error && <FormMessage tone="error">{error}</FormMessage>}

                        <Button
                            type="submit"
                            loading={updateProfileMutation.isPending}
                            disabled={!isDirty || updateProfileMutation.isPending}
                            size="sm"
                            h="38px"
                            borderRadius="full"
                            bg="black"
                            color="white"
                            fontWeight="semibold"
                            fontSize="14px"
                            _hover={{ bg: 'gray.800' }}
                            _disabled={{ bg: 'gray.300', color: 'gray.500', cursor: 'not-allowed' }}
                            mt={2}
                        >
                            <SaveIcon boxSize={4} />
                            Save
                        </Button>
                    </VStack>
                </form>
            </Box>
            <ToastMessage message={toast} onDone={() => setToast('')} />
        </AppLayout>
    )
}

function Field({ label, children }) {
    return (
        <Stack gap={1.5}>
            <Text fontSize="14px" fontWeight="semibold" color="gray.700">
                {label}
            </Text>
            {children}
        </Stack>
    )
}

export default ProfilePage

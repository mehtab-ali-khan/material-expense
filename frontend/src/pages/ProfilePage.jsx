import { useEffect, useRef, useState } from 'react'
import { Box, Button, Heading, Input, Stack, Text, VStack, HStack } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import PageLoader from '../components/PageLoader'
import ToastMessage from '../components/ToastMessage'
import FormMessage from '../components/FormMessage'
import { LogOutIcon, SaveIcon, XIcon } from '../components/Icons'
import { useAuth } from '../context/AuthContext'
import { updateMe } from '../api/auth'
import { formatPhoneDisplay } from '../utils/phone'

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

const readOnlyStyles = {
    ...fieldInputStyles,
    bg: 'gray.50',
    borderColor: 'gray.200',
    color: 'gray.700',
    cursor: 'default',
    _hover: { borderColor: 'gray.200' },
    _focus: { borderColor: 'gray.200', boxShadow: 'none' },
}

function ProfilePage() {
    const { companyName, profile, updateProfile, logout } = useAuth()
    const navigate = useNavigate()

    const [editing, setEditing] = useState(false)
    const [firstName, setFirstName] = useState(profile.firstName || '')
    const [lastName, setLastName] = useState(profile.lastName || '')
    const [phone, setPhone] = useState(profile.phone || '')
    const [name, setName] = useState(companyName || '')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [toast, setToast] = useState('')

    const firstNameRef = useRef(null)

    useEffect(() => {
        if (!editing) {
            setFirstName(profile.firstName || '')
            setLastName(profile.lastName || '')
            setPhone(profile.phone || '')
            setName(companyName || '')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile.firstName, profile.lastName, profile.phone, companyName])

    const handleEdit = (e) => {
        e?.preventDefault()
        e?.stopPropagation()
        setError('')
        setEditing(true)
        window.setTimeout(() => {
            firstNameRef.current?.focus()
            firstNameRef.current?.select?.()
        }, 50)
    }

    const handleCancel = (e) => {
        e?.preventDefault()
        e?.stopPropagation()
        setFirstName(profile.firstName || '')
        setLastName(profile.lastName || '')
        setPhone(profile.phone || '')
        setName(companyName || '')
        setError('')
        setEditing(false)
    }

    const handleLogout = (e) => {
        e?.preventDefault()
        e?.stopPropagation()
        logout()
        navigate('/login')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!editing) return
        setError('')

        if (!firstName.trim() || !lastName.trim() || !phone.trim() || !name.trim()) {
            setError('All fields are required.')
            return
        }

        setLoading(true)
        try {
            const res = await updateMe({
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                phone: phone.trim(),
                name: name.trim(),
            })
            updateProfile(res.data)
            setEditing(false)
            setToast('Profile updated')
        } catch (err) {
            const data = err.response?.data
            const detail =
                data?.phone?.[0] || data?.name?.[0] || data?.detail || null
            setError(detail || 'Could not save changes. Please check the values and try again.')
        } finally {
            setLoading(false)
        }
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
                                ref={firstNameRef}
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                readOnly={!editing}
                                enterKeyHint="next"
                                {...(editing ? fieldInputStyles : readOnlyStyles)}
                            />
                        </Field>

                        <Field label="Last name">
                            <Input
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                readOnly={!editing}
                                enterKeyHint="next"
                                {...(editing ? fieldInputStyles : readOnlyStyles)}
                            />
                        </Field>

                        <Field label="Phone">
                            <Input
                                type="tel"
                                inputMode="tel"
                                value={editing ? phone : (formatPhoneDisplay(phone) || 'Not added')}
                                onChange={(e) => setPhone(e.target.value)}
                                readOnly={!editing}
                                enterKeyHint="next"
                                {...(editing ? fieldInputStyles : readOnlyStyles)}
                            />
                        </Field>

                        <Field label="Company">
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                readOnly={!editing}
                                enterKeyHint="done"
                                {...(editing ? fieldInputStyles : readOnlyStyles)}
                            />
                        </Field>

                        {error && <FormMessage tone="error">{error}</FormMessage>}

                        {editing && (
                            <HStack justify="center" gap={3} mt={2}>
                                <Button
                                    type="button"
                                    size="sm"
                                    h="38px"
                                    flex="1"
                                    borderRadius="full"
                                    variant="outline"
                                    color="black"
                                    borderColor="gray.300"
                                    fontWeight="semibold"
                                    fontSize="14px"
                                    onClick={handleCancel}
                                    disabled={loading}
                                >
                                    <XIcon boxSize={4} />
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    loading={loading}
                                    size="sm"
                                    h="38px"
                                    flex="1"
                                    borderRadius="full"
                                    bg="black"
                                    color="white"
                                    fontWeight="semibold"
                                    fontSize="14px"
                                    _hover={{ bg: 'gray.800' }}
                                >
                                    <SaveIcon boxSize={4} />
                                    Save
                                </Button>
                            </HStack>
                        )}
                    </VStack>
                </form>

                {!editing && (
                    <HStack justify="center" gap={3} mt={5}>
                        <Button
                            type="button"
                            size="sm"
                            h="38px"
                            flex="1"
                            borderRadius="full"
                            variant="outline"
                            color="black"
                            borderColor="gray.300"
                            fontWeight="semibold"
                            fontSize="14px"
                            onClick={handleLogout}
                        >
                            <LogOutIcon boxSize={4} />
                            Log out
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            h="38px"
                            flex="1"
                            borderRadius="full"
                            bg="black"
                            color="white"
                            fontWeight="semibold"
                            fontSize="14px"
                            _hover={{ bg: 'gray.800' }}
                            onClick={handleEdit}
                        >
                            <SaveIcon boxSize={4} />
                            Edit
                        </Button>
                    </HStack>
                )}
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
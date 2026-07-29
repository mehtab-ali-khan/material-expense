import { useState } from 'react'
import { Box, Button, Heading, Textarea, VStack } from '@chakra-ui/react'
import AppLayout from '../components/AppLayout'
import { SaveIcon } from '../components/Icons'
import FormMessage from '../components/FormMessage'
import ToastMessage from '../components/ToastMessage'
import { sendContactMessage } from '../api/contact'

function ContactPage() {
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [toast, setToast] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!message.trim()) {
            setError('Please enter a message')
            return
        }

        setLoading(true)
        try {
            await sendContactMessage(message.trim())
            setMessage('')
            setToast('Message sent')
        } catch {
            setError('Could not send message. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <AppLayout>
            <Box
                px={4}
                pt="calc(16px + env(safe-area-inset-top))"
                pb="calc(88px + env(safe-area-inset-bottom))"
            >
                <Heading fontSize="24px" lineHeight="1.1" color="black" mb={4}>
                    Contact us
                </Heading>

                <form onSubmit={handleSubmit}>
                    <VStack gap={3} align="stretch">
                        <Textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Write your message..."
                            rows={8}
                            bg="white"
                            border="1px solid"
                            borderColor="gray.300"
                            color="black"
                            _placeholder={{ color: 'gray.400' }}
                            _hover={{ borderColor: 'gray.400' }}
                            _focus={{ borderColor: 'black', boxShadow: '0 0 0 1px black' }}
                            borderRadius="xl"
                            fontSize="16px"
                            resize="vertical"
                        />

                        {error && <FormMessage tone="error">{error}</FormMessage>}

                        <Button
                            type="submit"
                            loading={loading}
                            minH="52px"
                            borderRadius="xl"
                            bg="black"
                            color="white"
                            fontWeight="semibold"
                            _hover={{ bg: 'gray.800' }}
                        >
                            <SaveIcon />
                            Send
                        </Button>
                    </VStack>
                </form>
            </Box>
            <ToastMessage message={toast} onDone={() => setToast('')} />
        </AppLayout>
    )
}

export default ContactPage
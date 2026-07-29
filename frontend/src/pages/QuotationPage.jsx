import { Box, Heading } from '@chakra-ui/react'
import AppLayout from '../components/AppLayout'

function QuotationPage() {
    return (
        <AppLayout>
            <Box
                px={4}
                pt="calc(16px + env(safe-area-inset-top))"
                pb="calc(88px + env(safe-area-inset-bottom))"
            >
                <Heading fontSize="24px" lineHeight="1.1" color="black">
                    Quotations
                </Heading>
            </Box>
        </AppLayout>
    )
}

export default QuotationPage
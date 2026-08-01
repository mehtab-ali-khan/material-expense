import { useState } from 'react'
import { Box, Heading, Tabs, Button, HStack } from '@chakra-ui/react'
import AppLayout from '../components/AppLayout'
import QuotationForm from '../components/QuotationForm'
import QuotationPreview from '../components/QuotationPreview'
import { downloadQuotationPdf } from '../utils/generateQuotationPdf'
import { useAuth } from '../context/AuthContext'
import { SaveIcon, ArrowUpRightIcon } from '../components/Icons'

function QuotationPage() {
    const { companyName, profile } = useAuth()
    const [activeTab, setActiveTab] = useState('form')
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
    const [items, setItems] = useState([{ description: '', qty: '', price: '' }])
    const [vatPercent, setVatPercent] = useState('5')
    const [advancePercent, setAdvancePercent] = useState('50')

    const company = {
        name: companyName,
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone: profile.phone,
    }

    const handleDownload = () => {
        downloadQuotationPdf({
            company,
            items: items.filter((it) => it.description.trim()),
            date,
            vatPercent,
            advancePercent,
        })
    }

    return (
        <AppLayout>
            <Box
                px={4}
                pt="calc(16px + env(safe-area-inset-top))"
                pb="calc(88px + env(safe-area-inset-bottom))"
            >
                <Heading fontSize="24px" lineHeight="1.1" color="black" mb={4}>
                    Quotations
                </Heading>

                <Tabs.Root value={activeTab} onValueChange={(e) => setActiveTab(e.value)} variant="plain">
                    <Tabs.List mb={4} w="100%" position="relative">
                        <Tabs.Trigger value="form" flex="1" justifyContent="center">
                            Form
                        </Tabs.Trigger>
                        <Tabs.Trigger value="preview" flex="1" justifyContent="center">
                            Preview
                        </Tabs.Trigger>
                        <Tabs.Indicator
                            bg="black"
                            height="2px"
                            bottom="0"
                            transition="all 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
                        />
                    </Tabs.List>

                    <Tabs.Content value="form">
                        <QuotationForm
                            date={date} setDate={setDate}
                            items={items} setItems={setItems}
                            vatPercent={vatPercent} setVatPercent={setVatPercent}
                            advancePercent={advancePercent} setAdvancePercent={setAdvancePercent}
                        />

                        <HStack justify="center" mt={8}>
                            <Button
                                onClick={() => setActiveTab('preview')}
                                minH="38px" w="full" borderRadius="full"
                                bg="black" color="white" fontWeight="semibold"
                                _hover={{ bg: 'gray.800' }}
                            >
                                <ArrowUpRightIcon boxSize={4} />
                                Preview
                            </Button>
                        </HStack>
                    </Tabs.Content>

                    <Tabs.Content value="preview">
                        <QuotationPreview
                            company={company}
                            date={date}
                            items={items}
                            vatPercent={vatPercent}
                            advancePercent={advancePercent}
                        />
                        <HStack justify="center" mt={8}>
                            <Button
                                onClick={handleDownload}
                                minH="38px" w="full" borderRadius="full"
                                bg="black" color="white" fontWeight="semibold"
                                _hover={{ bg: 'gray.800' }}
                            >
                                <SaveIcon boxSize={4} />
                                Download PDF
                            </Button>
                        </HStack>
                    </Tabs.Content>
                </Tabs.Root>
            </Box>
        </AppLayout>
    )
}

export default QuotationPage
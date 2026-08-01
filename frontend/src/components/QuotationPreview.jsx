import { Box, Text, VStack, HStack } from '@chakra-ui/react'
import { buildQuotationTotals } from '../utils/generateQuotationPdf'
import { numberToWords } from '../utils/numberToWords'

const fmt = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })

const baseCell = {
    borderLeft: '0.5px solid black',
    borderRight: '0.5px solid black',
    padding: '6px 8px',
    fontSize: '11px',
    color: 'black',
    verticalAlign: 'top',
}

const thStyle = {
    ...baseCell,
    borderTop: '0.5px solid black',
    borderBottom: '0.5px solid black',
    fontWeight: 'bold',
    verticalAlign: 'middle',
    textAlign: 'center',
}
function QuotationPreview({ company, date, items, vatPercent, advancePercent }) {
    const { rows, subTotal, vat, grandTotal } = buildQuotationTotals(items, vatPercent)
    const advance = grandTotal * (Number(advancePercent) || 0) / 100
    const balance = grandTotal - advance

    return (
        <Box bg="white" p={{ base: 3, md: 5 }} fontSize="12px" color="black">
            <VStack align="center" gap={0} mb={1}>
                <Text
                    fontWeight="bold"
                    fontSize={{ base: '15px', md: '18px' }}
                    color="green.600"
                    borderBottom="2px solid"
                    borderColor="green.600"
                    pb={0.5}
                    textAlign="center"
                >
                    {(company?.name || '').toUpperCase()}
                </Text>
            </VStack>

            <VStack align="center" gap={0} mt={3} mb={2}>
                <Text
                    fontWeight="bold"
                    fontSize="13px"
                    color="blue.600"
                    borderBottom="2px solid"
                    borderColor="blue.600"
                    pb={0.5}
                >
                    QUOTATION
                </Text>
            </VStack>

            <HStack justify="flex-end" fontSize="11px" color="black" mb={3}>
                <Text>Date: {date}</Text>
            </HStack>

            <Text mb={2} fontSize="11px" color="black">
                We are placed to submit you a reasonable quotation for the following work.
            </Text>

            <Box overflowX="auto" className="styled-scrollbar">
                <table style={{ borderCollapse: 'collapse', minWidth: '480px', width: '100%' }}>
                    <thead>
                        <tr>
                            <th style={{ ...thStyle, width: '50px' }}>Sl no</th>
                            <th style={{ ...thStyle, minWidth: '160px' }}>Description</th>
                            <th style={{ ...thStyle, width: '60px' }}>Qty</th>
                            <th style={{ ...thStyle, width: '70px' }}>Price</th>
                            <th style={{ ...thStyle, width: '90px' }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => {
                            const isLastItemRow = i === rows.length - 1
                            return (
                                <tr key={i}>
                                    <td style={{ ...baseCell, textAlign: 'center', borderBottom: isLastItemRow ? '0.5px solid black' : 'none' }}>{i + 1}</td>
                                    <td style={{ ...baseCell, borderBottom: isLastItemRow ? '0.5px solid black' : 'none' }}>{r.description}</td>
                                    <td style={{ ...baseCell, textAlign: 'center', borderBottom: isLastItemRow ? '0.5px solid black' : 'none' }}>{r.qty}</td>
                                    <td style={{ ...baseCell, textAlign: 'center', borderBottom: isLastItemRow ? '0.5px solid black' : 'none' }}>{fmt(r.price)}</td>
                                    <td style={{ ...baseCell, textAlign: 'center', borderBottom: isLastItemRow ? '0.5px solid black' : 'none' }}>{fmt(r.amount)}</td>
                                </tr>
                            )
                        })}

                        <tr>
                            <td style={{ ...baseCell, borderTop: '0.5px solid black', borderBottom: '0.5px solid black' }} colSpan={2}></td>
                            <td style={{ ...baseCell, borderTop: '0.5px solid black', borderBottom: '0.5px solid black', fontWeight: 600, textAlign: 'center' }} colSpan={2}>Sub total</td>
                            <td style={{ ...baseCell, borderTop: '0.5px solid black', borderBottom: '0.5px solid black', textAlign: 'center' }}>{fmt(subTotal)}</td>
                        </tr>
                        <tr>
                            <td style={{ ...baseCell, borderBottom: '0.5px solid black' }} colSpan={2}></td>
                            <td style={{ ...baseCell, borderBottom: '0.5px solid black', fontWeight: 600, textAlign: 'center' }} colSpan={2}>Vat {vatPercent}%</td>
                            <td style={{ ...baseCell, borderBottom: '0.5px solid black', textAlign: 'center' }}>{fmt(vat)}</td>
                        </tr>
                        <tr>
                            <td style={{ ...baseCell, borderBottom: '0.5px solid black' }} colSpan={2}></td>
                            <td style={{ ...baseCell, borderBottom: '0.5px solid black', fontWeight: 'bold', textAlign: 'center' }} colSpan={2}>Grand total</td>
                            <td style={{ ...baseCell, borderBottom: '0.5px solid black', textAlign: 'center', fontWeight: 'bold' }}>{fmt(grandTotal)}/-</td>
                        </tr>
                    </tbody>
                </table>
            </Box>

            <Text mt={3} fontSize="11px" lineHeight="1.4" color="black">
                Amount in word: {numberToWords(grandTotal)}
            </Text>

            <Text mt={3} fontWeight="bold" fontSize="11px" color="black">Payment terms:</Text>
            <VStack align="stretch" gap={0.5} maxW="260px">
                <HStack justify="space-between" fontSize="11px" color="black">
                    <Text>First payment {advancePercent}% advance</Text>
                    <Text>{fmt(advance)}/-</Text>
                </HStack>
                <HStack justify="space-between" fontSize="11px" color="black">
                    <Text>Balance</Text>
                    <Text>{fmt(balance)}/-</Text>
                </HStack>
            </VStack>

            <Text mt={4} fontSize="11px" color="black">Thanks and regards.</Text>
            <Text mt={2} fontSize="11px" color="black" fontWeight="semibold">
                {`${company?.first_name || ''} ${company?.last_name || ''}`.trim()}
            </Text>
            <Text fontSize="11px" color="black">{company?.phone}</Text>
        </Box>
    )
}

export default QuotationPreview
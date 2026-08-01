const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function chunkToWords(n) {
  let str = ''
  if (n >= 100) {
    str += ones[Math.floor(n / 100)] + ' Hundred '
    n %= 100
  }
  if (n >= 20) {
    str += tens[Math.floor(n / 10)] + ' '
    n %= 10
  }
  if (n > 0) str += ones[n] + ' '
  return str.trim()
}

export function numberToWords(value) {
  const num = Number(value) || 0
  const wholePart = Math.floor(num)
  const decimalPart = Math.round((num - wholePart) * 100)

  if (wholePart === 0 && decimalPart === 0) return 'Zero Only'

  let n = wholePart
  const parts = []
  const crore = Math.floor(n / 10000000); n %= 10000000
  const lakh = Math.floor(n / 100000); n %= 100000
  const thousand = Math.floor(n / 1000); n %= 1000
  const hundred = n

  if (crore) parts.push(chunkToWords(crore) + ' Crore')
  if (lakh) parts.push(chunkToWords(lakh) + ' Lakh')
  if (thousand) parts.push(chunkToWords(thousand) + ' Thousand')
  if (hundred) parts.push(chunkToWords(hundred))

  let result = parts.join(' ') || 'Zero'
  if (decimalPart > 0) {
    result += ` and ${chunkToWords(decimalPart)}/100`
  }
  return result.trim() + ' Only'
}
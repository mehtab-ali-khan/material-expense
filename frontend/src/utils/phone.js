export function formatPhoneDisplay(digits) {
    if (!digits) return ''
    // "923088253383" -> "+92 308 8253383"
    const match = digits.match(/^92(\d{3})(\d{7})$/)
    if (match) {
        return `+92 ${match[1]} ${match[2]}`
    }
    return `+${digits}`
}
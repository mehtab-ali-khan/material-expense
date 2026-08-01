import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { numberToWords } from './numberToWords'

export function buildQuotationTotals(items, vatPercent) {
  const rows = items.map((it) => {
    const qty = Number(it.qty) || 0
    const price = Number(it.price) || 0
    return { ...it, amount: qty * price }
  })
  const subTotal = rows.reduce((s, r) => s + r.amount, 0)
  const vat = subTotal * (Number(vatPercent) || 0) / 100
  const grandTotal = subTotal + vat
  return { rows, subTotal, vat, grandTotal }
}

export function generateQuotationPdf({ company, items, date, vatPercent, advancePercent }) {
  const { rows, subTotal, vat, grandTotal } = buildQuotationTotals(items, vatPercent)
  const advance = grandTotal * (Number(advancePercent) || 0) / 100
  const balance = grandTotal - advance

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 40
  const centerX = pageWidth / 2

  const colWidths = { 0: 40, 1: 190, 2: 55, 3: 70, 4: 90 }
  const tableWidth = Object.values(colWidths).reduce((a, b) => a + b, 0)
  const sideMargin = (pageWidth - tableWidth) / 2

  // Company name — centered, green, underlined
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(0, 128, 0)
  const companyName = (company?.name || '').toUpperCase()
  doc.text(companyName, centerX, 55, { align: 'center' })
  const nameWidth = doc.getTextWidth(companyName)
  doc.setDrawColor(0, 128, 0)
  doc.setLineWidth(1)
  doc.line(centerX - nameWidth / 2, 60, centerX + nameWidth / 2, 60)

  // QUOTATION — centered, blue, underlined
  doc.setFontSize(13)
  doc.setTextColor(0, 0, 200)
  doc.text('QUOTATION', centerX, 85, { align: 'center' })
  const titleWidth = doc.getTextWidth('QUOTATION')
  doc.setDrawColor(0, 0, 200)
  doc.line(centerX - titleWidth / 2, 90, centerX + titleWidth / 2, 90)

  // Date — right aligned
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text(`Date: ${date}`, pageWidth - margin, 105, { align: 'right' })

  doc.text(
    'We are placed to submit you a reasonable quotation for the following work.',
    sideMargin,
    125
  )

  const itemRowCount = rows.length

  const bodyRows = rows.map((r, i) => [
    i + 1,
    r.description,
    r.qty,
    Number(r.price).toLocaleString('en-US', { maximumFractionDigits: 2 }),
    Number(r.amount).toLocaleString('en-US', { maximumFractionDigits: 2 }),
  ])

  // Totals rows: col0 = blank (merges with col1), col2 = label (merges with col3), col4 = value
  bodyRows.push(['', '', 'Sub total', '', subTotal.toLocaleString('en-US', { maximumFractionDigits: 2 })])
  bodyRows.push(['', '', `Vat ${vatPercent}%`, '', vat.toLocaleString('en-US', { maximumFractionDigits: 2 })])
  bodyRows.push(['', '', 'Grand total', '', `${grandTotal.toLocaleString('en-US', { maximumFractionDigits: 2 })}/-`])

  const subTotalRowIndex = itemRowCount
  const vatRowIndex = itemRowCount + 1
  const grandTotalRowIndex = itemRowCount + 2

  doc.autoTable({
    startY: 140,
    head: [['Sl no', 'Description', 'Qty', 'Price', 'Amount']],
    body: bodyRows,
    theme: 'plain',
    tableWidth: tableWidth,
    styles: {
      fontSize: 9,
      cellPadding: 5,
      textColor: [0, 0, 0],
      fillColor: [255, 255, 255],
      lineColor: [0, 0, 0],
      lineWidth: { top: 0, bottom: 0, left: 0.5, right: 0.5 },
      halign: 'center',
      valign: 'top',
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineWidth: 0.5,
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: colWidths[0] },
      1: { halign: 'left', cellWidth: colWidths[1] },
      2: { cellWidth: colWidths[2] },
      3: { cellWidth: colWidths[3] },
      4: { cellWidth: colWidths[4] },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return

      const idx = data.row.index
      const isLastItemRow = idx === itemRowCount - 1
      const isTotalsRow = idx >= itemRowCount

      if (isTotalsRow) {
        if (data.column.index === 0) {
          data.cell.colSpan = 2
        }
        if (data.column.index === 2) {
          data.cell.colSpan = 2
          data.cell.styles.halign = 'center'
          data.cell.styles.fontStyle = idx === grandTotalRowIndex ? 'bold' : 'normal'
        }
        if (data.column.index === 4 && idx === grandTotalRowIndex) {
          data.cell.styles.fontStyle = 'bold'
        }
        data.cell.styles.lineWidth = { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 }
      } else if (isLastItemRow) {
        data.cell.styles.lineWidth = { top: 0, bottom: 0.5, left: 0.5, right: 0.5 }
      }
    },
    margin: { left: sideMargin, right: sideMargin },
  })

  let y = doc.lastAutoTable.finalY + 20
  const textX = sideMargin

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.text(`Amount in word: ${numberToWords(grandTotal)}`, textX, y)

  y += 24
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('Payment terms:', textX, y)
  doc.setFont('helvetica', 'normal')
  y += 16
  doc.text(`First payment ${advancePercent}% advance`, textX, y)
  doc.text(`${advance.toLocaleString('en-US', { maximumFractionDigits: 2 })}/-`, textX + 180, y)
  y += 16
  doc.text('Balance', textX, y)
  doc.text(`${balance.toLocaleString('en-US', { maximumFractionDigits: 2 })}/-`, textX + 180, y)

  y += 32
  doc.text('Thanks and regards.', textX, y)
  y += 16
  const signatory = `${company?.first_name || ''} ${company?.last_name || ''}`.trim()
  if (signatory) {
    doc.setFont('helvetica', 'bold')
    doc.text(signatory, textX, y)
    doc.setFont('helvetica', 'normal')
    y += 16
  }
  if (company?.phone) {
    doc.text(company.phone, textX, y)
  }

  return doc
}

export function downloadQuotationPdf(params) {
  const doc = generateQuotationPdf(params)
  doc.save(`quotation-${params.date}.pdf`)
}
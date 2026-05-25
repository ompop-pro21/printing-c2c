import jsPDF from 'jspdf'
import type { Receipt } from './supabase'

export function downloadReceipt(receipt: Receipt, userEmail: string) {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  })

  // Brutalist styling
  pdf.setFont('courier', 'bold')
  
  // Outer border
  pdf.setLineWidth(4)
  pdf.rect(40, 40, 515, 760)
  
  // Header box
  pdf.setFillColor(0, 0, 0)
  pdf.rect(40, 40, 515, 80, 'F')
  
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(28)
  pdf.text('PRINTQUEUE PRO', 60, 80)
  pdf.setFontSize(14)
  pdf.text('OFFICIAL RECEIPT', 60, 105)

  // Details
  pdf.setTextColor(0, 0, 0)
  pdf.setFontSize(12)
  
  let y = 160
  const lineHeight = 20

  const drawRow = (label: string, value: string) => {
    pdf.text(label.padEnd(20, ' '), 60, y)
    pdf.text(value, 200, y)
    y += lineHeight
  }

  drawRow('RECEIPT ID:', receipt.id)
  drawRow('DATE:', new Date(receipt.created_at).toLocaleString())
  drawRow('ACCOUNT:', userEmail)
  drawRow('PAYMENT REF:', receipt.payment_id)
  
  y += 20
  pdf.setLineWidth(2)
  pdf.line(60, y - 10, 535, y - 10)
  
  drawRow('FILE NAME:', receipt.file_name || 'Document')
  drawRow('TOTAL PAGES:', `${receipt.pages}`)
  drawRow('MODE:', receipt.config_color ? 'COLOR' : 'B&W')
  drawRow('SIDES:', receipt.config_duplex ? 'DOUBLE-SIDED' : 'SINGLE-SIDED')
  drawRow('COPIES:', `${receipt.config_copies}`)
  drawRow('PRIORITY FEE:', receipt.config_priority ? 'YES (+INR 10.00)' : 'NO')
  
  y += 20
  pdf.line(60, y - 10, 535, y - 10)
  
  pdf.setFontSize(18)
  pdf.text('TOTAL PAID:', 60, y)
  pdf.text(`INR ${receipt.amount.toFixed(2)}`, 200, y)
  
  // Footer
  pdf.setFontSize(10)
  pdf.text('THANK YOU FOR USING PRINTQUEUE PRO.', 60, 750)
  pdf.text('BRUTALIST PRINTING FOR THE MODERN AGE.', 60, 765)

  pdf.save(`Receipt_${receipt.id}.pdf`)
}

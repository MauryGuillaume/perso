/**
 * PDF Export utility using jsPDF + html2canvas
 * Falls back to print dialog if libs unavailable
 */

async function _buildPDF(bilan, patient) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas')
  ])

  const el = document.getElementById('pdf-content')
  if (!el) throw new Error('PDF template element not found')

  const originalBg = el.style.background
  el.style.background = 'white'

  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    width: 794,
    scrollX: 0,
    scrollY: 0,
    logging: false
  })

  el.style.background = originalBg

  const imgData = canvas.toDataURL('image/jpeg', 0.92)
  const pdf = new jsPDF('p', 'mm', 'a4')

  const pdfWidth  = pdf.internal.pageSize.getWidth()
  const pdfHeight = pdf.internal.pageSize.getHeight()
  const imgWidth  = pdfWidth
  const imgHeight = (canvas.height * pdfWidth) / canvas.width

  let heightLeft = imgHeight
  let position   = 0
  let page       = 0

  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
  heightLeft -= pdfHeight

  while (heightLeft > 0) {
    position = -(pdfHeight * ++page)
    pdf.addPage()
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
    heightLeft -= pdfHeight
  }

  const filename = `bilan_${patient.nom}_${patient.prenom}_${bilan.date}.pdf`
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_.-]/g, '')

  return { pdf, filename }
}

export async function exportBilanPDF(bilan, patient) {
  const { pdf, filename } = await _buildPDF(bilan, patient)
  pdf.save(filename)
  return filename
}

/** Returns the PDF as a base64 data URI string (for email attachment) */
export async function getBilanPDFBase64(bilan, patient) {
  const { pdf, filename } = await _buildPDF(bilan, patient)
  const base64 = pdf.output('datauristring') // "data:application/pdf;base64,..."
  return { base64, filename }
}

/**
 * Fallback: print the PDF template via browser print dialog
 */
export function printBilan() {
  const el = document.getElementById('pdf-content')
  if (!el) return

  const win = window.open('', '_blank')
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <title>Bilan Podologique</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #1c2b27; background: white; }
        @media print { body { -webkit-print-color-adjust: exact; } }
      </style>
    </head>
    <body>${el.outerHTML}</body>
    </html>
  `)
  win.document.close()
  win.focus()
  win.print()
  win.close()
}

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export async function generateBuktiBayar(data: {
  applicantName: string; registrationNumber: string
  invoiceNumber: string; stageName: string
  amount: number; paidAt: string; paymentMethod: string
  schoolName?: string
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 420])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  const school = data.schoolName || 'Pesantren Tahfidz Qur\'an dan Digital Arrahman'
  const y = (v: number) => 420 - v

  page.drawText(school, { x: 50, y: y(50), size: 14, font: fontBold, color: rgb(0, 0.3, 0.1) })
  page.drawText('BUKTI PEMBAYARAN PPDB', { x: 50, y: y(72), size: 16, font: fontBold, color: rgb(0, 0.4, 0.2) })

  // Separator
  page.drawLine({ start: { x: 50, y: y(85) }, end: { x: 545, y: y(85) }, color: rgb(0.8, 0.8, 0.8), thickness: 1 })

  const details = [
    { label: 'Nama', value: data.applicantName },
    { label: 'No. Pendaftaran', value: data.registrationNumber },
    { label: 'No. Invoice', value: data.invoiceNumber },
    { label: 'Tahap Pembayaran', value: data.stageName },
    { label: 'Jumlah', value: `Rp ${Number(data.amount).toLocaleString('id-ID')}` },
    { label: 'Metode', value: data.paymentMethod },
    { label: 'Tanggal Bayar', value: data.paidAt },
    { label: 'Status', value: 'LUNAS' },
  ]

  details.forEach((d, i) => {
    const yPos = y(110 + i * 25)
    page.drawText(d.label, { x: 50, y: yPos, size: 11, font: font })
    page.drawText(':', { x: 180, y: yPos, size: 11, font: font })
    page.drawText(d.value, { x: 190, y: yPos, size: 11, font: d.label === 'Status' ? fontBold : font })
  })

  page.drawLine({ start: { x: 50, y: y(320) }, end: { x: 545, y: y(320) }, color: rgb(0.8, 0.8, 0.8), thickness: 1 })
  page.drawText('Dokumen ini diterbitkan secara elektronik oleh sistem PPDB.', { x: 50, y: y(340), size: 8, font, color: rgb(0.5, 0.5, 0.5) })

  return doc.save()
}

export async function generateMou(data: {
  applicantName: string; registrationNumber: string
  parentName: string; levelName: string; categoryName: string
  schoolName?: string; templateContent?: string
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const y = (v: number) => 842 - v

  const school = data.schoolName || 'Pesantren Tahfidz Qur\'an dan Digital Arrahman'

  page.drawText('MEMORANDUM OF UNDERSTANDING (MOU)', { x: 50, y: y(50), size: 14, font: fontBold })
  page.drawText(school, { x: 50, y: y(70), size: 11, font: fontBold })

  const content = data.templateContent || `Yang bertanda tangan di bawah ini:\n\nPihak Pertama (Orang Tua/Wali):\nNama: ${data.parentName}\n\nPihak Kedua (Sekolah):\n${school}\n\nMenyetujui untuk mengikuti seluruh proses PPDB dan menaati peraturan yang berlaku di ${school}.`

  const lines = content.split('\n')
  lines.forEach((line, i) => {
    page.drawText(line, { x: 50, y: y(120 + i * 18), size: 10, font })
  })

  const sigLine = y(120 + lines.length * 18 + 60)
  page.drawLine({ start: { x: 50, y: sigLine }, end: { x: 250, y: sigLine }, color: rgb(0, 0, 0) })
  page.drawText(data.applicantName, { x: 50, y: sigLine + 15, size: 9, font })
  page.drawText(`No. Pendaftaran: ${data.registrationNumber}`, { x: 50, y: sigLine + 28, size: 8, font })

  return doc.save()
}

export async function generateSuratPenerimaan(data: {
  applicantName: string; registrationNumber: string
  letterNumber: string; issuedDate: string
  levelName: string; categoryName: string
  schoolName?: string
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const y = (v: number) => 842 - v

  const school = data.schoolName || 'Pesantren Tahfidz Qur\'an dan Digital Arrahman'

  page.drawText('SURAT PENERIMAAN SISWA BARU', { x: 50, y: y(50), size: 14, font: fontBold, color: rgb(0, 0.3, 0.1) })
  page.drawText(school, { x: 50, y: y(70), size: 11, font: fontBold })
  page.drawText(`No: ${data.letterNumber}`, { x: 50, y: y(95), size: 10, font })

  page.drawLine({ start: { x: 50, y: y(110) }, end: { x: 545, y: y(110) }, color: rgb(0.8, 0.8, 0.8), thickness: 1 })

  const body = [
    'Dengan ini kami menyatakan bahwa:',
    '',
    `Nama: ${data.applicantName}`,
    `No. Pendaftaran: ${data.registrationNumber}`,
    `Jenjang: ${data.levelName}`,
    `Kategori: ${data.categoryName}`,
    '',
    'DINYATAKAN DITERIMA sebagai siswa/i di sekolah kami.',
    '',
    'Surat penerimaan ini menjadi dokumen resmi untuk melakukan registrasi ulang.',
    '',
    `Dikeluarkan di: (Sekolah)`,
    `Tanggal: ${data.issuedDate}`,
  ]

  body.forEach((line, i) => {
    page.drawText(line, { x: 50, y: y(140 + i * 20), size: 11, font: line.includes('DITERIMA') || line.includes('DINYATAKAN') ? fontBold : font })
  })

  return doc.save()
}

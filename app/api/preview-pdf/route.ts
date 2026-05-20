import { NextRequest, NextResponse } from 'next/server'
import { buildPaystub, buildNEC, buildMISC, buildInvoice } from '@/lib/pdf-builders'
import type { PaystubData, Form1099NECData, Form1099MISCData, InvoiceData } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfmake = require('pdfmake') as {
  setFonts: (f: Record<string, unknown>) => void
  createPdf: (def: Record<string, unknown>) => { getBuffer: () => Promise<Buffer> }
}

pdfmake.setFonts({
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
})

const WATERMARK = {
  text: 'SAMPLE',
  color: '#0f0f1a',
  opacity: 0.07,
  bold: true,
  fontSize: 96,
}

export const maxDuration = 15

export async function POST(req: NextRequest) {
  const contentLength = req.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 32_768) {
    return new NextResponse('Payload too large', { status: 413 })
  }

  let body: { type: string; data: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 })
  }

  const { type, data } = body
  if (!type || !data) return new NextResponse('Missing type or data', { status: 400 })

  let pdfBuffer: Buffer
  try {
    let docDef: Record<string, unknown>
    if (type === 'paystub') docDef = buildPaystub(data as unknown as PaystubData)
    else if (type === '1099-nec') docDef = buildNEC(data as unknown as Form1099NECData)
    else if (type === 'invoice') docDef = buildInvoice(data as unknown as InvoiceData)
    else if (type === '1099-misc') docDef = buildMISC(data as unknown as Form1099MISCData)
    else return new NextResponse('Unknown type', { status: 400 })

    docDef.watermark = WATERMARK
    pdfBuffer = await pdfmake.createPdf(docDef).getBuffer()
  } catch (err) {
    console.error('[preview-pdf]', err)
    return new NextResponse('Preview generation failed', { status: 500 })
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="preview.pdf"',
    },
  })
}

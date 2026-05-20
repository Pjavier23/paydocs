import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { buildPaystub, buildNEC, buildMISC, buildInvoice } from '@/lib/pdf-builders'
import type { PaystubData, Form1099NECData, Form1099MISCData, InvoiceData } from '@/types'

// pdfmake is CJS with no React dependency — loads cleanly in Next.js serverless.
// serverExternalPackages keeps it external so Vercel's NFT traces the AFM font
// files (pdfkit/js/data/*.afm) into the deployment bundle.
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

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return new NextResponse('Missing sessionId', { status: 400 })

  const admin = createAdminClient()
  const { data: doc, error } = await admin
    .from('paydocs_documents')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .eq('paid', true)
    .single()

  if (error || !doc) return new NextResponse('Document not found or not paid', { status: 403 })

  let pdfBuffer: Buffer
  try {
    let docDef: Record<string, unknown>
    if (doc.type === 'paystub') docDef = buildPaystub(doc.data_json as PaystubData)
    else if (doc.type === '1099-nec') docDef = buildNEC(doc.data_json as Form1099NECData)
    else if (doc.type === 'invoice') docDef = buildInvoice(doc.data_json as InvoiceData)
    else docDef = buildMISC(doc.data_json as Form1099MISCData)

    pdfBuffer = await pdfmake.createPdf(docDef).getBuffer()
  } catch (err) {
    console.error('[generate-pdf]', err)
    return new NextResponse('PDF generation failed', { status: 500 })
  }

  const date = new Date().toISOString().split('T')[0]
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="paydocs-${doc.type}-${date}.pdf"`,
    },
  })
}

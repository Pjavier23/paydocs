import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { spawnSync } from 'child_process'
import path from 'path'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')

  if (!sessionId) {
    return new NextResponse('Missing sessionId', { status: 400 })
  }

  const admin = createAdminClient()
  const { data: doc, error } = await admin
    .from('paydocs_documents')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .eq('paid', true)
    .single()

  if (error || !doc) {
    return new NextResponse('Document not found or not paid', { status: 403 })
  }

  // Spawn a child process running the CommonJS worker script.
  // This completely isolates react-pdf from Next.js's RSC React instance,
  // eliminating the React version mismatch that causes error #31.
  const workerPath = path.join(process.cwd(), 'scripts', 'pdf-worker.cjs')
  const result = spawnSync(process.execPath, [workerPath], {
    input: JSON.stringify({ type: doc.type, data: doc.data_json }),
    maxBuffer: 10 * 1024 * 1024,
    timeout: 30000,
  })

  if (result.status !== 0) {
    const errMsg = result.stderr?.toString() ?? 'unknown error'
    console.error('[generate-pdf] worker failed:', errMsg)
    return new NextResponse('PDF generation failed', { status: 500 })
  }

  const pdfBuffer = result.stdout as Buffer
  const date = new Date().toISOString().split('T')[0]

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="paydocs-${doc.type}-${date}.pdf"`,
    },
  })
}

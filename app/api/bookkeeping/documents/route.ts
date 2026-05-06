import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getUserFromToken } from '@/lib/supabase-admin'

function getToken(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : null
}

// GET /api/bookkeeping/documents?client_id=xxx
export async function GET(req: NextRequest) {
  const token = getToken(req)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('client_id')
  if (!clientId) return NextResponse.json({ error: 'client_id required' }, { status: 400 })

  const supabase = createAdminClient()

  // Verify user owns this client
  const { data: client } = await supabase
    .from('bk_clients')
    .select('id')
    .eq('id', clientId)
    .eq('owner_id', user.id)
    .single()

  // Also allow client themselves (they uploaded it)
  if (!client) {
    const { data: selfClient } = await supabase
      .from('bk_clients')
      .select('id')
      .eq('id', clientId)
      .single()

    if (!selfClient) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: documents, error } = await supabase
    .from('bk_documents')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ documents })
}

// POST /api/bookkeeping/documents — upload a document
export async function POST(req: NextRequest) {
  const token = getToken(req)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const formData = await req.formData()
  const clientId = formData.get('client_id') as string
  const docType = (formData.get('doc_type') as string) || 'receipt'
  const file = formData.get('file') as File | null

  if (!clientId) return NextResponse.json({ error: 'client_id required' }, { status: 400 })
  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })

  const supabase = createAdminClient()

  // Upload to Supabase Storage
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${clientId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error: uploadError } = await supabase.storage
    .from('bookkeeping')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
  }

  // Get signed URL (valid 1 year)
  const { data: urlData } = await supabase.storage
    .from('bookkeeping')
    .createSignedUrl(path, 60 * 60 * 24 * 365)

  const fileUrl = urlData?.signedUrl || path

  // Insert document record
  const { data: document, error: dbError } = await supabase
    .from('bk_documents')
    .insert({
      client_id: clientId,
      uploaded_by: user.id,
      doc_type: docType,
      file_url: fileUrl,
      ai_processed: false,
    })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  // Trigger AI extraction in background (don't await)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://paydocs-seven.vercel.app'
  fetch(`${appUrl}/api/bookkeeping/documents/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ document_id: document.id, file_url: fileUrl }),
  }).catch(() => {}) // fire and forget

  return NextResponse.json({ document }, { status: 201 })
}

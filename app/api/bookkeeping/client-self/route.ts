import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getUserFromToken } from '@/lib/supabase-admin'

function getToken(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : null
}

// GET /api/bookkeeping/client-self
// Returns the bk_client record + documents + tax events for the logged-in client user
export async function GET(req: NextRequest) {
  const token = getToken(req)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const supabase = createAdminClient()

  // Find client record by email match or by documents uploaded
  const { data: clients } = await supabase
    .from('bk_clients')
    .select('*')
    .eq('email', user.email)
    .limit(1)

  const client = clients?.[0] || null

  if (!client) {
    return NextResponse.json({ client: null, documents: [], taxEvents: [] })
  }

  const [{ data: documents }, { data: taxEvents }] = await Promise.all([
    supabase
      .from('bk_documents')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('bk_tax_events')
      .select('*')
      .eq('client_id', client.id)
      .order('due_date', { ascending: true }),
  ])

  return NextResponse.json({
    client,
    documents: documents || [],
    taxEvents: taxEvents || [],
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getUserFromToken } from '@/lib/supabase-admin'

function getToken(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : null
}

// GET /api/bookkeeping/tax-events?client_id=xxx
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

  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: events, error } = await supabase
    .from('bk_tax_events')
    .select('*')
    .eq('client_id', clientId)
    .order('due_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ events })
}

// PATCH /api/bookkeeping/tax-events — mark event complete/incomplete
export async function PATCH(req: NextRequest) {
  const token = getToken(req)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { event_id, completed } = await req.json()
  if (!event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  const supabase = createAdminClient()

  // Verify user owns the client this event belongs to.
  // The Supabase client infers a complex union type for nested selects that doesn't
  // expose the joined table fields directly, so we cast to a minimal known shape.
  const { data: eventCheck } = await supabase
    .from('bk_tax_events')
    .select('id, bk_clients!inner(owner_id)')
    .eq('id', event_id)
    .single()

  type EventWithClient = { id: string; bk_clients: { owner_id: string } | null }
  const ownerCheck = eventCheck as EventWithClient | null
  if (!ownerCheck || ownerCheck.bk_clients?.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('bk_tax_events')
    .update({
      completed: !!completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', event_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ event: data })
}

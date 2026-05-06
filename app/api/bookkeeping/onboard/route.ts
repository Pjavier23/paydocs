import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// GET /api/bookkeeping/onboard?token=xxx — public, lookup by invite token
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: client, error } = await supabase
    .from('bk_clients')
    .select('id, business_name, contact_name, email, industry, subscription_status, monthly_fee, onboarded_at')
    .eq('invite_token', token)
    .single()

  if (error || !client) return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 })

  return NextResponse.json({ client })
}

// POST /api/bookkeeping/onboard — complete onboarding (updates client record)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, business_name, contact_name, industry, ein } = body

  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: client, error: findError } = await supabase
    .from('bk_clients')
    .select('id')
    .eq('invite_token', token)
    .single()

  if (findError || !client) return NextResponse.json({ error: 'Invalid invite token' }, { status: 404 })

  const { error: updateError } = await supabase
    .from('bk_clients')
    .update({
      business_name: business_name || undefined,
      contact_name: contact_name || undefined,
      industry: industry || undefined,
      onboarded_at: new Date().toISOString(),
      subscription_status: 'active',
    })
    .eq('id', client.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ success: true, client_id: client.id })
}

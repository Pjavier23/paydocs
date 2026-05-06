import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// GET /api/bookkeeping/onboard?token=xxx — lookup client by invite token (public)
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

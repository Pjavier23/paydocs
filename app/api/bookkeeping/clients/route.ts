import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getUserFromToken } from '@/lib/supabase-admin'

function getToken(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : null
}

// GET /api/bookkeeping/clients — list Pedro's clients
export async function GET(req: NextRequest) {
  const token = getToken(req)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const supabase = createAdminClient()

  const { data: clients, error } = await supabase
    .from('bk_clients')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Attach last upload date + doc count for each client
  const enriched = await Promise.all(
    (clients || []).map(async (client: any) => {
      const { data: docs, count } = await supabase
        .from('bk_documents')
        .select('created_at', { count: 'exact' })
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(1)

      return {
        ...client,
        doc_count: count || 0,
        last_upload: docs?.[0]?.created_at || null,
      }
    })
  )

  return NextResponse.json({ clients: enriched })
}

// POST /api/bookkeeping/clients — create new client + send invite
export async function POST(req: NextRequest) {
  const token = getToken(req)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const body = await req.json()
  const { business_name, contact_name, email, phone, industry, monthly_fee } = body

  if (!business_name) {
    return NextResponse.json({ error: 'business_name is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Create client
  const { data: client, error } = await supabase
    .from('bk_clients')
    .insert({
      owner_id: user.id,
      business_name,
      contact_name,
      email,
      phone,
      industry,
      monthly_fee: monthly_fee || 100,
      subscription_status: 'trial',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-generate quarterly estimated tax due dates for the current year
  const year = new Date().getFullYear()
  const taxEvents = [
    { event_type: 'quarterly_estimated', due_date: `${year}-04-15`, title: `Q1 ${year} Estimated Tax`, description: 'Federal quarterly estimated tax payment — Jan 1 – Mar 31' },
    { event_type: 'quarterly_estimated', due_date: `${year}-06-15`, title: `Q2 ${year} Estimated Tax`, description: 'Federal quarterly estimated tax payment — Apr 1 – May 31' },
    { event_type: 'quarterly_estimated', due_date: `${year}-09-15`, title: `Q3 ${year} Estimated Tax`, description: 'Federal quarterly estimated tax payment — Jun 1 – Aug 31' },
    { event_type: 'quarterly_estimated', due_date: `${year + 1}-01-15`, title: `Q4 ${year} Estimated Tax`, description: 'Federal quarterly estimated tax payment — Sep 1 – Dec 31' },
    { event_type: 'annual_filing', due_date: `${year + 1}-04-15`, title: `${year} Annual Tax Return`, description: 'Federal income tax return filing deadline' },
  ]

  await supabase.from('bk_tax_events').insert(
    taxEvents.map((e) => ({ ...e, client_id: client.id }))
  )

  // Send invite email via Resend
  let emailSent = false
  if (email && client.invite_token) {
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/bookkeeping/onboard/${client.invite_token}`
    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Pedro Javier <pedro@paydocs.app>',
          to: [email],
          subject: 'Pedro Javier invited you to PayDocs Bookkeeping',
          html: `
            <div style="font-family: 'DM Sans', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #f5f3ee;">
              <div style="background: white; border: 1px solid #e5e7eb; border-radius: 4px; padding: 40px;">
                <h2 style="font-size: 28px; color: #0f0f1a; margin: 0 0 8px;">You're invited 📚</h2>
                <p style="color: #6b7280; margin: 0 0 24px;">Pedro Javier has set up your bookkeeping account on PayDocs.</p>
                
                <p style="color: #374151; margin: 0 0 24px;">Hi ${contact_name || 'there'},<br><br>
                  I've set up a bookkeeping dashboard for <strong>${business_name}</strong>. 
                  You'll be able to upload receipts, track expenses, and stay on top of your tax deadlines — all in one place.
                </p>

                <a href="${inviteUrl}" style="display: inline-block; background: #0f0f1a; color: #fbbf24; font-family: monospace; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; text-decoration: none; padding: 14px 28px; border-radius: 4px; margin: 0 0 24px;">
                  Accept Invitation →
                </a>

                <p style="color: #9ca3af; font-size: 13px; border-top: 1px solid #e5e7eb; padding-top: 20px; margin: 0;">
                  Monthly fee: $${monthly_fee || 100}/mo &nbsp;·&nbsp; First month free<br>
                  Questions? Reply to this email.
                </p>
              </div>
            </div>
          `,
        }),
      })
      emailSent = emailRes.ok
    } catch {
      emailSent = false
    }
  }

  return NextResponse.json({ client, emailSent }, { status: 201 })
}

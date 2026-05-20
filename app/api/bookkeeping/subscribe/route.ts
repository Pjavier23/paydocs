import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getUserFromToken } from '@/lib/supabase-admin'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any })

function getToken(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : null
}

// POST /api/bookkeeping/subscribe
// Creates a Stripe customer + subscription for a bookkeeping client
export async function POST(req: NextRequest) {
  const token = getToken(req)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { client_id } = await req.json()
  if (!client_id) return NextResponse.json({ error: 'client_id required' }, { status: 400 })

  const supabase = createAdminClient()

  // Fetch the client
  const { data: client, error: clientError } = await supabase
    .from('bk_clients')
    .select('*')
    .eq('id', client_id)
    .eq('owner_id', user.id)
    .single()

  if (clientError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  try {
    // Create or retrieve Stripe customer
    let customerId = client.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: client.email || undefined,
        name: client.business_name,
        metadata: {
          client_id: client.id,
          contact_name: client.contact_name || '',
        },
      })
      customerId = customer.id
    }

    // Create subscription — use monthly_fee from client record (in dollars → cents)
    const unitAmount = Math.round((client.monthly_fee || 100) * 100)
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          price_data: {
            currency: 'usd',
            unit_amount: unitAmount,
            recurring: { interval: 'month' },
            product_data: { name: 'PayDocs Bookkeeping' },
          } as any,
        },
      ],
      metadata: { client_id: client.id },
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    })

    const statusMap: Record<string, string> = {
      active: 'active',
      trialing: 'trial',
      incomplete: 'pending',
      incomplete_expired: 'cancelled',
      past_due: 'past_due',
      canceled: 'cancelled',
      unpaid: 'past_due',
    }

    // Save to bk_clients
    await supabase
      .from('bk_clients')
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        subscription_status: statusMap[subscription.status] ?? 'trial',
      })
      .eq('id', client_id)

    return NextResponse.json({
      subscription_id: subscription.id,
      customer_id: customerId,
      status: subscription.status,
      client_secret: (subscription.latest_invoice as any)?.payment_intent?.client_secret || null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: `Stripe error: ${err.message}` }, { status: 500 })
  }
}

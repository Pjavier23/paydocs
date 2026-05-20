import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getUserFromToken } from '@/lib/supabase-admin'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

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

    // Create subscription — use monthly_fee from client record (in dollars → cents).
    // stripe.subscriptions.create items do not support inline price_data + product_data
    // in the SDK types, so we create an ad-hoc Price first, then reference it.
    const unitAmount = Math.round((client.monthly_fee || 100) * 100)
    const price = await stripe.prices.create({
      currency: 'usd',
      unit_amount: unitAmount,
      recurring: { interval: 'month' },
      product_data: { name: 'PayDocs Bookkeeping' },
    })

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: price.id }],
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

    // latest_invoice is expanded, so we access client_secret via a cast.
    // Stripe types don't expose the expanded payment_intent on the invoice union type.
    const invoice = subscription.latest_invoice as Stripe.Invoice | null
    const paymentIntent = invoice?.payment_intent
    const clientSecret =
      paymentIntent && typeof paymentIntent === 'object' && 'client_secret' in paymentIntent
        ? (paymentIntent as Stripe.PaymentIntent).client_secret
        : null

    return NextResponse.json({
      subscription_id: subscription.id,
      customer_id: customerId,
      status: subscription.status,
      client_secret: clientSecret,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Stripe error: ${message}` }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { stripe, PRICES, DOC_NAMES } from '@/lib/stripe'
import type { DocType } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { docId, type } = await req.json() as { docId: string; type: DocType }

    if (!docId || !type || !(type in PRICES)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: DOC_NAMES[type],
              description: type === 'paystub'
                ? 'Employer + employee copies — instant PDF download'
                : 'Print & mail ready PDF',
            },
            unit_amount: PRICES[type],
          },
          quantity: 1,
        },
      ],
      metadata: { docId, type },
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout?docId=${docId}&type=${type}`,
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (err) {
    console.error('[create-checkout]', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}

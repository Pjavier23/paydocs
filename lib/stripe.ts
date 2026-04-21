import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export const PRICES = {
  paystub: 399,   // $3.99 in cents
  '1099-nec': 499,
  '1099-misc': 499,
} as const

export const PRICE_LABELS = {
  paystub: '$3.99',
  '1099-nec': '$4.99',
  '1099-misc': '$4.99',
} as const

export const DOC_NAMES = {
  paystub: 'Pay Stub',
  '1099-nec': '1099-NEC Form',
  '1099-misc': '1099-MISC Form',
} as const

'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { useLang } from '@/components/ui/LanguageContext'
import { PRICE_LABELS, DOC_NAMES } from '@/lib/stripe'
import type { DocType } from '@/types'
import { useState } from 'react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function CheckoutContent() {
  const params = useSearchParams()
  const router = useRouter()
  const { t, lang } = useLang()
  const [loading, setLoading] = useState(false)

  const docId = params.get('docId')
  const type = params.get('type') as DocType

  if (!docId || !type) {
    router.push('/')
    return null
  }

  const price = PRICE_LABELS[type]
  const docName = DOC_NAMES[type]

  const handleCheckout = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId, type }),
      })
      const { sessionId } = await res.json()
      const stripe = await stripePromise
      await stripe!.redirectToCheckout({ sessionId })
    } catch (err) {
      console.error(err)
      alert('Payment error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="card border-ink">
          <div className="section-title">{t('order_summary')}</div>

          <div className="py-6 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-display text-2xl text-ink">{docName}</div>
                <div className="font-mono text-xs text-gray-400 mt-1">
                  {type !== 'paystub'
                    ? (lang === 'en' ? 'Print & mail ready PDF' : 'PDF listo para imprimir')
                    : (lang === 'en' ? 'Employer + employee copies' : 'Copias empleador + empleado')}
                </div>
              </div>
              <div className="font-display text-3xl text-ink">{price}</div>
            </div>
          </div>

          <div className="py-4 space-y-2">
            <div className="flex items-center gap-2 font-mono text-xs text-gray-500">
              <span>✓</span>
              <span>{lang === 'en' ? 'Instant PDF download after payment' : 'Descarga inmediata del PDF'}</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-gray-500">
              <span>✓</span>
              <span>{lang === 'en' ? 'Secure payment via Stripe' : 'Pago seguro por Stripe'}</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-gray-500">
              <span>✓</span>
              <span>{lang === 'en' ? 'No account required' : 'Sin cuenta requerida'}</span>
            </div>
            {type !== 'paystub' && (
              <div className="flex items-center gap-2 font-mono text-xs text-amber-600">
                <span>⚠</span>
                <span>{lang === 'en' ? 'Not for e-filing — print and mail only' : 'No para e-file — solo imprimir y enviar'}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading}
            aria-busy={loading}
            className="btn-accent w-full mt-2"
          >
            {loading
              ? (lang === 'en' ? 'Redirecting to Stripe...' : 'Redirigiendo a Stripe...')
              : `${t('pay_download')} ${price}`}
          </button>

          <button
            onClick={() => router.back()}
            disabled={loading}
            className="btn-secondary w-full mt-3"
          >
            ← {t('back')}
          </button>
        </div>

        <p className="font-mono text-[10px] text-center text-gray-400 mt-4 uppercase tracking-wider">
          {lang === 'en' ? 'Powered by Stripe · SSL encrypted' : 'Pagos por Stripe · Encriptado SSL'}
        </p>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="font-mono text-sm text-gray-400">Loading...</div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}

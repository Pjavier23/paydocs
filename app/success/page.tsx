'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/components/ui/LanguageContext'

function SuccessContent() {
  const params = useSearchParams()
  const { lang } = useLang()
  const sessionId = params.get('session_id')

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="card border-ink">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="font-display text-3xl text-ink mb-2">
            {lang === 'en' ? 'Payment Successful' : 'Pago Exitoso'}
          </h1>
          <p className="font-mono text-sm text-gray-400 mb-8">
            {lang === 'en'
              ? 'Your document is ready to download.'
              : 'Tu documento está listo para descargar.'}
          </p>

          {sessionId ? (
            <a
              href={`/api/generate-pdf?sessionId=${sessionId}`}
              className="btn-accent w-full block text-center mb-3"
            >
              {lang === 'en' ? 'Download PDF' : 'Descargar PDF'}
            </a>
          ) : (
            <p className="font-mono text-xs text-red-500 mb-3">
              {lang === 'en' ? 'Session ID missing. Check your email for confirmation.' : 'ID de sesión faltante. Revisa tu email.'}
            </p>
          )}

          <Link href="/dashboard" className="btn-secondary w-full block text-center mb-3">
            {lang === 'en' ? 'My Documents' : 'Mis Documentos'}
          </Link>
          <Link href="/" className="font-mono text-xs text-gray-400 hover:text-ink transition-colors">
            ← {lang === 'en' ? 'Back to Home' : 'Volver al Inicio'}
          </Link>
        </div>

        <p className="font-mono text-[10px] text-gray-400 mt-4 uppercase tracking-wider">
          {lang === 'en' ? 'A receipt has been sent to your email' : 'Se envió un recibo a tu correo'}
        </p>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="font-mono text-sm text-gray-400">Loading...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}

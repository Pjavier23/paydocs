'use client'

import Link from 'next/link'
import { useLang } from '@/components/ui/LanguageContext'

const docs = [
  {
    key: 'paystub',
    href: '/create/paystub',
    icon: '💵',
    title_en: 'Create Paystub',
    title_es: 'Crear Talón de Pago',
    price: '$3.99 per paystub',
    desc_en: 'Employer & employee copies with YTD totals',
    desc_es: 'Copias del empleador y empleado con totales del año',
    badge: null,
  },
  {
    key: 'invoice',
    href: '/create/invoice',
    icon: '🧾',
    title_en: 'Create Invoice',
    title_es: 'Crear Factura',
    price: '$2.99 per invoice',
    desc_en: 'Professional invoices with line items, tax & discounts',
    desc_es: 'Facturas profesionales con artículos, impuestos y descuentos',
    badge: null,
  },
  {
    key: '1099-nec',
    href: '/create/1099-nec',
    icon: '📋',
    title_en: 'Create 1099-NEC',
    title_es: 'Crear 1099-NEC',
    price: '$4.99 per form',
    desc_en: 'Nonemployee compensation — print & mail',
    desc_es: 'Compensación no empleado — imprime y envía',
    badge: 'Print & mail only',
  },
  {
    key: '1099-misc',
    href: '/create/1099-misc',
    icon: '📄',
    title_en: 'Create 1099-MISC',
    title_es: 'Crear 1099-MISC',
    price: '$4.99 per form',
    desc_en: 'Rents, royalties, other income — print & mail',
    desc_es: 'Alquileres, regalías, otros ingresos — imprime y envía',
    badge: 'Print & mail only',
  },
]

export default function HomePage() {
  const { t, lang } = useLang()

  return (
    <div className="min-h-screen bg-paper">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block font-mono text-[10px] uppercase tracking-[4px] text-gray-400 mb-6 border border-gray-200 px-4 py-2 rounded-full">
          {lang === 'en' ? 'Pay per document · No subscription' : 'Paga por documento · Sin suscripción'}
        </div>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-ink leading-tight tracking-tight mb-6">
          {lang === 'en' ? 'Professional Pay Documents' : 'Documentos de Pago Profesionales'}
        </h1>
        <p className="font-sans text-gray-500 text-lg max-w-xl mx-auto mb-12">
          {lang === 'en'
            ? 'Paystubs, invoices, and 1099 forms — pay per document, download instantly.'
            : 'Talones, facturas y formularios 1099 — paga por documento, descarga al instante.'}
        </p>

        {/* Doc Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {docs.map((doc) => (
            <Link
              key={doc.key}
              href={doc.href}
              className="group card hover:border-ink transition-all hover:shadow-lg text-left flex flex-col"
            >
              <div className="text-3xl mb-3">{doc.icon}</div>
              <div className="font-display text-lg text-ink mb-1">
                {lang === 'en' ? doc.title_en : doc.title_es}
              </div>
              <div className="font-mono text-xs text-gray-400 mb-4 flex-1">
                {lang === 'en' ? doc.desc_en : doc.desc_es}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-medium text-ink">{doc.price}</span>
                <span className="font-mono text-xs text-gray-300 group-hover:text-accent transition-colors">→</span>
              </div>
              {doc.badge && (
                <div className="mt-3 font-mono text-[9px] uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-1 rounded">
                  {doc.badge}
                </div>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-ink text-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="font-mono text-[10px] uppercase tracking-[4px] text-gray-500 mb-10 text-center">
            {lang === 'en' ? 'How it works' : 'Cómo funciona'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                en: ['Fill the form', 'Enter employer, employee, and pay details'],
                es: ['Llena el formulario', 'Ingresa los datos del empleador, empleado y pago'],
              },
              {
                step: '02',
                en: ['Preview & pay', 'Review your document, then pay securely via Stripe'],
                es: ['Vista previa y paga', 'Revisa tu documento, luego paga de forma segura por Stripe'],
              },
              {
                step: '03',
                en: ['Download instantly', 'Get your PDF immediately — print or save'],
                es: ['Descarga al instante', 'Obtén tu PDF de inmediato — imprime o guarda'],
              },
            ].map(({ step, en, es }) => (
              <div key={step}>
                <div className="font-mono text-4xl text-gray-700 mb-3">{step}</div>
                <div className="font-display text-xl text-white mb-2">{lang === 'en' ? en[0] : es[0]}</div>
                <div className="font-sans text-sm text-gray-400">{lang === 'en' ? en[1] : es[1]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center font-mono text-xs text-gray-400">
        <p>{t('note_1099')}</p>
        <p className="mt-2">© {new Date().getFullYear()} PayDocs</p>
      </footer>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/components/ui/LanguageContext'
import type { Form1099NECData } from '@/types'
import { createClient } from '@/lib/supabase'

const CURRENT_YEAR = new Date().getFullYear().toString()

const DEFAULT: Form1099NECData = {
  payerName: '',
  payerAddress: '',
  payerCity: '',
  payerEIN: '',
  payerPhone: '',
  recipientName: '',
  recipientAddress: '',
  recipientCity: '',
  recipientTIN: '',
  recipientAccountNo: '',
  nonemployeeComp: 0,
  federalTaxWithheld: 0,
  stateTaxWithheld: 0,
  stateCode: 'MD',
  stateIdNo: '',
  taxYear: CURRENT_YEAR,
}

const fmt = (n: number) => `$${(n || 0).toFixed(2)}`

export default function Form1099NECPage() {
  const { t, lang } = useLang()
  const router = useRouter()
  const [data, setData] = useState<Form1099NECData>(DEFAULT)
  const [loading, setLoading] = useState(false)

  const set = (field: keyof Form1099NECData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
    setData((prev) => ({ ...prev, [field]: val }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { data: doc, error } = await supabase
        .from('documents')
        .insert({
          user_id: user?.id ?? null,
          type: '1099-nec',
          data_json: data as unknown as Record<string, unknown>,
          paid: false,
        })
        .select()
        .single()

      if (error) throw error

      router.push(`/checkout?docId=${doc.id}&type=1099-nec`)
    } catch (err) {
      console.error(err)
      alert('Error saving. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const Field = ({ label, field, type = 'text', placeholder = '' }: {
    label: string; field: keyof Form1099NECData; type?: string; placeholder?: string
  }) => (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        value={data[field] as string | number}
        onChange={set(field)}
        placeholder={placeholder}
        className="input-field"
      />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="font-mono text-[10px] uppercase tracking-[4px] text-gray-400 mb-2">
          {lang === 'en' ? 'Step 1 of 2 — Fill Details' : 'Paso 1 de 2 — Completa los detalles'}
        </div>
        <h1 className="font-display text-4xl text-ink">1099-NEC</h1>
        <p className="font-mono text-sm text-gray-400 mt-1">{t('price_1099')}</p>
        <div className="mt-2 inline-block font-mono text-[10px] uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded">
          ⚠ {t('note_1099')}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Tax Year */}
          <div className="card">
            <div className="section-title">{t('tax_year')}</div>
            <Field label={t('tax_year')} field="taxYear" placeholder={CURRENT_YEAR} />
          </div>

          {/* Payer */}
          <div className="card">
            <div className="section-title">{t('payer_info')}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Field label={t('company_name')} field="payerName" /></div>
              <div className="col-span-2"><Field label={t('company_address')} field="payerAddress" /></div>
              <div className="col-span-2"><Field label={t('company_city')} field="payerCity" placeholder="City, ST ZIP" /></div>
              <Field label={t('ein')} field="payerEIN" placeholder="XX-XXXXXXX" />
              <Field label={t('phone')} field="payerPhone" placeholder="(XXX) XXX-XXXX" />
            </div>
          </div>

          {/* Recipient */}
          <div className="card">
            <div className="section-title">{t('recipient_info')}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Field label={t('recipient_name')} field="recipientName" /></div>
              <div className="col-span-2"><Field label={t('recipient_address')} field="recipientAddress" /></div>
              <div className="col-span-2"><Field label={t('recipient_city')} field="recipientCity" placeholder="City, ST ZIP" /></div>
              <Field label={t('recipient_tin')} field="recipientTIN" placeholder="XXX-XX-XXXX" />
              <Field label={t('account_no')} field="recipientAccountNo" />
            </div>
          </div>

          {/* Amounts */}
          <div className="card">
            <div className="section-title">{t('amounts')}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label={t('box1_nec')} field="nonemployeeComp" type="number" />
              </div>
              <Field label={t('box4')} field="federalTaxWithheld" type="number" />
              <div>
                <label className="label">{t('state')}</label>
                <input value={data.stateCode} onChange={set('stateCode')} className="input-field" placeholder="MD" />
              </div>
              <Field label={t('box6')} field="stateTaxWithheld" type="number" />
              <Field label={t('state_id')} field="stateIdNo" />
            </div>
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="lg:sticky lg:top-6 h-fit space-y-4">
          <div className="card border-ink">
            <div className="section-title">1099-NEC Summary</div>
            <div className="font-display text-2xl text-ink mb-1">{data.recipientName || '—'}</div>
            <div className="font-mono text-xs text-gray-400 mb-4">{data.payerName || '—'} · {data.taxYear}</div>

            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{lang === 'en' ? 'Box 1 — NEC' : 'Casilla 1 — NEC'}</span>
                <span className="text-ink font-medium">{fmt(data.nonemployeeComp)}</span>
              </div>
              {data.federalTaxWithheld > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{lang === 'en' ? 'Box 4 — Federal' : 'Casilla 4 — Federal'}</span>
                  <span className="text-red-500">– {fmt(data.federalTaxWithheld)}</span>
                </div>
              )}
              {data.stateTaxWithheld > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{lang === 'en' ? `Box 6 — ${data.stateCode}` : `Casilla 6 — ${data.stateCode}`}</span>
                  <span className="text-red-500">– {fmt(data.stateTaxWithheld)}</span>
                </div>
              )}
            </div>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
              <p className="font-mono text-[10px] uppercase tracking-wider text-amber-700">
                {t('print_mail_only')}
              </p>
            </div>
          </div>

          <div className="card bg-ink text-white border-ink">
            <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-3">
              {lang === 'en' ? 'You will receive' : 'Recibirás'}
            </div>
            {['copy_b', 'copy_c', 'copy_1', 'copy_2'].map((k) => (
              <div key={k} className="font-mono text-xs text-gray-300 mb-1.5">
                · {t(k as 'copy_b' | 'copy_c' | 'copy_1' | 'copy_2')}
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !data.recipientName || !data.payerName || data.nonemployeeComp <= 0}
            className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading
              ? (lang === 'en' ? 'Saving...' : 'Guardando...')
              : t('continue_payment')} →
          </button>
          <p className="font-mono text-[10px] text-center text-gray-400 uppercase tracking-wider">
            {t('price_1099')} · Stripe secured
          </p>
        </div>
      </div>
    </div>
  )
}

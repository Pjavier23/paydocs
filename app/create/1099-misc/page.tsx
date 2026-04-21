'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/components/ui/LanguageContext'
import type { Form1099MISCData } from '@/types'
import { createClient } from '@/lib/supabase'

const CURRENT_YEAR = new Date().getFullYear().toString()

const DEFAULT: Form1099MISCData = {
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
  rents: 0,
  royalties: 0,
  otherIncome: 0,
  federalTaxWithheld: 0,
  fishingBoatProceeds: 0,
  medicalPayments: 0,
  substitutePayments: 0,
  cropInsurance: 0,
  grossAttorney: 0,
  stateTaxWithheld: 0,
  stateCode: 'MD',
  stateIdNo: '',
  taxYear: CURRENT_YEAR,
}

const fmt = (n: number) => `$${(n || 0).toFixed(2)}`

export default function Form1099MISCPage() {
  const { t, lang } = useLang()
  const router = useRouter()
  const [data, setData] = useState<Form1099MISCData>(DEFAULT)
  const [loading, setLoading] = useState(false)

  const set = (field: keyof Form1099MISCData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
    setData((prev) => ({ ...prev, [field]: val }))
  }

  const totalIncome = data.rents + data.royalties + data.otherIncome +
    data.fishingBoatProceeds + data.medicalPayments + data.substitutePayments +
    data.cropInsurance + data.grossAttorney

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { data: doc, error } = await supabase
        .from('documents')
        .insert({
          user_id: user?.id ?? null,
          type: '1099-misc',
          data_json: data as unknown as Record<string, unknown>,
          paid: false,
        })
        .select()
        .single()

      if (error) throw error

      router.push(`/checkout?docId=${doc.id}&type=1099-misc`)
    } catch (err) {
      console.error(err)
      alert('Error saving. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const Field = ({ label, field, type = 'text', placeholder = '' }: {
    label: string; field: keyof Form1099MISCData; type?: string; placeholder?: string
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
      <div className="mb-8">
        <div className="font-mono text-[10px] uppercase tracking-[4px] text-gray-400 mb-2">
          {lang === 'en' ? 'Step 1 of 2 — Fill Details' : 'Paso 1 de 2 — Completa los detalles'}
        </div>
        <h1 className="font-display text-4xl text-ink">1099-MISC</h1>
        <p className="font-mono text-sm text-gray-400 mt-1">{t('price_1099')}</p>
        <div className="mt-2 inline-block font-mono text-[10px] uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded">
          ⚠ {t('note_1099')}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="card">
            <div className="section-title">{t('tax_year')}</div>
            <Field label={t('tax_year')} field="taxYear" />
          </div>

          <div className="card">
            <div className="section-title">{t('payer_info')}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Field label={t('company_name')} field="payerName" /></div>
              <div className="col-span-2"><Field label={t('company_address')} field="payerAddress" /></div>
              <div className="col-span-2"><Field label={t('company_city')} field="payerCity" /></div>
              <Field label={t('ein')} field="payerEIN" placeholder="XX-XXXXXXX" />
              <Field label={t('phone')} field="payerPhone" />
            </div>
          </div>

          <div className="card">
            <div className="section-title">{t('recipient_info')}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Field label={t('recipient_name')} field="recipientName" /></div>
              <div className="col-span-2"><Field label={t('recipient_address')} field="recipientAddress" /></div>
              <div className="col-span-2"><Field label={t('recipient_city')} field="recipientCity" /></div>
              <Field label={t('recipient_tin')} field="recipientTIN" />
              <Field label={t('account_no')} field="recipientAccountNo" />
            </div>
          </div>

          <div className="card">
            <div className="section-title">{t('amounts')}</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('box1_misc')} field="rents" type="number" />
              <Field label={t('box2')} field="royalties" type="number" />
              <Field label={t('box3')} field="otherIncome" type="number" />
              <Field label={t('box4')} field="federalTaxWithheld" type="number" />
              <Field label={t('box5')} field="fishingBoatProceeds" type="number" />
              <Field label={t('box6_misc')} field="medicalPayments" type="number" />
              <Field label={t('box8')} field="substitutePayments" type="number" />
              <Field label={t('box9')} field="cropInsurance" type="number" />
              <Field label={t('box10')} field="grossAttorney" type="number" />
              <div>
                <label className="label">{t('state')}</label>
                <input value={data.stateCode} onChange={set('stateCode')} className="input-field" />
              </div>
              <Field label={t('box16')} field="stateTaxWithheld" type="number" />
              <Field label={t('state_id')} field="stateIdNo" />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:sticky lg:top-6 h-fit space-y-4">
          <div className="card border-ink">
            <div className="section-title">1099-MISC Summary</div>
            <div className="font-display text-2xl text-ink mb-1">{data.recipientName || '—'}</div>
            <div className="font-mono text-xs text-gray-400 mb-4">{data.payerName || '—'} · {data.taxYear}</div>

            <div className="space-y-2 font-mono text-sm">
              {[
                [t('box1_misc'), data.rents],
                [t('box2'), data.royalties],
                [t('box3'), data.otherIncome],
                [t('box5'), data.fishingBoatProceeds],
                [t('box6_misc'), data.medicalPayments],
                [t('box8'), data.substitutePayments],
                [t('box9'), data.cropInsurance],
                [t('box10'), data.grossAttorney],
              ]
                .filter(([, v]) => (v as number) > 0)
                .map(([label, val]) => (
                  <div key={label as string} className="flex justify-between">
                    <span className="text-gray-500 text-xs">{label as string}</span>
                    <span className="text-ink">{fmt(val as number)}</span>
                  </div>
                ))}
              <div className="border-t border-gray-100 pt-2 flex justify-between font-medium">
                <span className="text-gray-500">Total Income</span>
                <span className="text-ink">{fmt(totalIncome)}</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
              <p className="font-mono text-[10px] uppercase tracking-wider text-amber-700">
                {t('print_mail_only')}
              </p>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !data.recipientName || !data.payerName || totalIncome <= 0}
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

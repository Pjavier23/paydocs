'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/components/ui/LanguageContext'
import { FormField } from '@/components/ui/FormField'
import type { Form1099MISCData } from '@/types'
import { createClient } from '@/lib/supabase'

const CURRENT_YEAR = new Date().getFullYear().toString()
const fmt = (n: number) => `$${(n || 0).toFixed(2)}`

const DEFAULT: Form1099MISCData = {
  payerName: '', payerAddress: '', payerCity: '', payerEIN: '', payerPhone: '',
  recipientName: '', recipientAddress: '', recipientCity: '', recipientTIN: '', recipientAccountNo: '',
  rents: 0, royalties: 0, otherIncome: 0, federalTaxWithheld: 0,
  fishingBoatProceeds: 0, medicalPayments: 0, substitutePayments: 0,
  cropInsurance: 0, grossAttorney: 0, stateTaxWithheld: 0,
  stateCode: 'MD', stateIdNo: '', taxYear: CURRENT_YEAR,
}

export default function Form1099MISCPage() {
  const { t, lang } = useLang()
  const router = useRouter()
  const [data, setData] = useState<Form1099MISCData>(DEFAULT)
  const [loading, setLoading] = useState(false)

  const set = (field: keyof Form1099MISCData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
    setData((prev) => ({ ...prev, [field]: val }))
  }

  const totalIncome = data.rents + data.royalties + data.otherIncome +
    data.fishingBoatProceeds + data.medicalPayments + data.substitutePayments +
    data.cropInsurance + data.grossAttorney

  const canSubmit = !loading && !!data.recipientName && !!data.payerName && totalIncome > 0

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: doc, error } = await supabase
        .from('paydocs_documents')
        .insert({ user_id: user?.id ?? null, type: '1099-misc', data_json: data as unknown as Record<string, unknown>, paid: false })
        .select().single()
      if (error) throw error
      router.push(`/checkout?docId=${doc.id}&type=1099-misc`)
    } catch (err) {
      console.error(err)
      alert('Error saving. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-28 lg:pb-10">
      <div className="mb-6">
        <div className="font-mono text-[10px] uppercase tracking-[4px] text-gray-400 mb-2">
          {lang === 'en' ? 'Step 1 of 2 — Fill Details' : 'Paso 1 de 2 — Completa los detalles'}
        </div>
        <h1 className="font-display text-3xl sm:text-4xl text-ink">1099-MISC</h1>
        <p className="font-mono text-sm text-gray-400 mt-1">{t('price_1099')}</p>
        <div className="mt-2 inline-block font-mono text-[10px] uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded">
          ⚠ {t('note_1099')}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div className="space-y-6">
          <div className="card">
            <div className="section-title">{t('tax_year')}</div>
            <FormField label={t('tax_year')} value={data.taxYear} onChange={set('taxYear')} />
          </div>

          <div className="card">
            <div className="section-title">{t('payer_info')}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><FormField label={t('company_name')} value={data.payerName} onChange={set('payerName')} /></div>
              <div className="sm:col-span-2"><FormField label={t('company_address')} value={data.payerAddress} onChange={set('payerAddress')} /></div>
              <div className="sm:col-span-2"><FormField label={t('company_city')} value={data.payerCity} onChange={set('payerCity')} /></div>
              <FormField label={t('ein')} value={data.payerEIN} onChange={set('payerEIN')} placeholder="XX-XXXXXXX" />
              <FormField label={t('phone')} value={data.payerPhone} onChange={set('payerPhone')} />
            </div>
          </div>

          <div className="card">
            <div className="section-title">{t('recipient_info')}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><FormField label={t('recipient_name')} value={data.recipientName} onChange={set('recipientName')} /></div>
              <div className="sm:col-span-2"><FormField label={t('recipient_address')} value={data.recipientAddress} onChange={set('recipientAddress')} /></div>
              <div className="sm:col-span-2"><FormField label={t('recipient_city')} value={data.recipientCity} onChange={set('recipientCity')} /></div>
              <FormField label={t('recipient_tin')} value={data.recipientTIN} onChange={set('recipientTIN')} />
              <FormField label={t('account_no')} value={data.recipientAccountNo} onChange={set('recipientAccountNo')} />
            </div>
          </div>

          <div className="card">
            <div className="section-title">{t('amounts')}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label={t('box1_misc')} value={data.rents} onChange={set('rents')} type="number" />
              <FormField label={t('box2')} value={data.royalties} onChange={set('royalties')} type="number" />
              <FormField label={t('box3')} value={data.otherIncome} onChange={set('otherIncome')} type="number" />
              <FormField label={t('box4')} value={data.federalTaxWithheld} onChange={set('federalTaxWithheld')} type="number" />
              <FormField label={t('box5')} value={data.fishingBoatProceeds} onChange={set('fishingBoatProceeds')} type="number" />
              <FormField label={t('box6_misc')} value={data.medicalPayments} onChange={set('medicalPayments')} type="number" />
              <FormField label={t('box8')} value={data.substitutePayments} onChange={set('substitutePayments')} type="number" />
              <FormField label={t('box9')} value={data.cropInsurance} onChange={set('cropInsurance')} type="number" />
              <FormField label={t('box10')} value={data.grossAttorney} onChange={set('grossAttorney')} type="number" />
              <div>
                <label className="label">{t('state')}</label>
                <input value={data.stateCode} onChange={set('stateCode') as React.ChangeEventHandler<HTMLInputElement>} className="input-field" maxLength={2} />
              </div>
              <FormField label={t('box16')} value={data.stateTaxWithheld} onChange={set('stateTaxWithheld')} type="number" />
              <FormField label={t('state_id')} value={data.stateIdNo} onChange={set('stateIdNo')} />
            </div>
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden lg:block lg:sticky lg:top-6 h-fit space-y-4">
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
              ].filter(([, v]) => (v as number) > 0).map(([label, val]) => (
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
              <p className="font-mono text-[10px] uppercase tracking-wider text-amber-700">{t('print_mail_only')}</p>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={!canSubmit} className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed">
            {loading ? (lang === 'en' ? 'Saving...' : 'Guardando...') : t('continue_payment')} →
          </button>
          <p className="font-mono text-[10px] text-center text-gray-400 uppercase tracking-wider">
            {t('price_1099')} · Stripe secured
          </p>
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex items-center gap-3 z-40">
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-wider text-gray-400">1099-MISC · {data.taxYear}</div>
          <div className="font-display text-xl text-ink truncate">{fmt(totalIncome)}</div>
        </div>
        <button onClick={handleSubmit} disabled={!canSubmit} className="btn-primary shrink-0 disabled:opacity-40 disabled:cursor-not-allowed">
          {loading ? '...' : `${t('continue_payment')} →`}
        </button>
      </div>
    </div>
  )
}

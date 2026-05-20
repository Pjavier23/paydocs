'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/components/ui/LanguageContext'
import { FormField } from '@/components/ui/FormField'
import type { PaystubData } from '@/types'
import { createClient } from '@/lib/supabase'

type Freq = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'

function calcPayPeriod(freq: Freq): { start: string; end: string; payDate: string } {
  const today = new Date()
  const iso = (d: Date) => d.toISOString().split('T')[0]
  const add = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }
  const dow = today.getDay() // 0=Sun … 6=Sat

  // Most recent Friday
  const lastFri = add(today, -(((dow + 2) % 7) + 1))
  // Upcoming Friday (or today if Friday)
  const nextFri = dow === 5 ? today : add(today, (5 - dow + 7) % 7)

  if (freq === 'weekly') {
    return { start: iso(add(lastFri, -6)), end: iso(lastFri), payDate: iso(nextFri) }
  }
  if (freq === 'biweekly') {
    return { start: iso(add(lastFri, -13)), end: iso(lastFri), payDate: iso(nextFri) }
  }
  if (freq === 'semimonthly') {
    const d = today.getDate()
    const y = today.getFullYear(), m = today.getMonth()
    if (d <= 15) {
      // First half — fill previous second half (16–EOM)
      const lastM = m === 0 ? 11 : m - 1
      const lastY = m === 0 ? y - 1 : y
      return {
        start: iso(new Date(lastY, lastM, 16)),
        end: iso(new Date(y, m, 0)),
        payDate: iso(new Date(y, m, 1)),
      }
    } else {
      return {
        start: iso(new Date(y, m, 1)),
        end: iso(new Date(y, m, 15)),
        payDate: iso(new Date(y, m, 20)),
      }
    }
  }
  // monthly
  const y = today.getFullYear(), m = today.getMonth()
  const lastM = m === 0 ? 11 : m - 1
  const lastY = m === 0 ? y - 1 : y
  return {
    start: iso(new Date(lastY, lastM, 1)),
    end: iso(new Date(y, m, 0)),
    payDate: iso(new Date(y, m, 5)),
  }
}

const DEFAULT: PaystubData = {
  companyName: '', companyAddress: '', companyCity: '', companyEIN: '',
  empName: '', empAddress: '', empCity: '', empSSN: '',
  empFilingStatus: 'Single',
  payPeriodStart: '', payPeriodEnd: '', payDate: '', checkNumber: '',
  payType: 'hourly',
  hourlyRate: 0, hoursWorked: 80, overtimeHours: 0, overtimeRate: 0, grossPay: 0,
  federalTax: 0, stateTax: 0, stateCode: 'MD',
  socialSecurity: 0, medicare: 0, healthInsurance: 0, otherDeduction: 0, otherDeductionLabel: '',
  ytdGross: 0, ytdFederal: 0, ytdState: 0, ytdSS: 0, ytdMedicare: 0, ytdNet: 0,
}

const fmt = (n: number) => `$${(n || 0).toFixed(2)}`

export default function PaystubFormPage() {
  const { t, lang } = useLang()
  const router = useRouter()
  const [data, setData] = useState<PaystubData>(DEFAULT)
  const [loading, setLoading] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [showSummary, setShowSummary] = useState(false)

  const handlePreview = async () => {
    setPreviewing(true)
    try {
      const res = await fetch('/api/preview-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'paystub', data }),
      })
      if (!res.ok) throw new Error('Preview failed')
      const blob = await res.blob()
      window.open(URL.createObjectURL(blob), '_blank')
    } catch {
      alert('Could not generate preview. Please try again.')
    } finally {
      setPreviewing(false)
    }
  }

  const applyFreq = (freq: Freq) => {
    const { start, end, payDate } = calcPayPeriod(freq)
    setData(prev => ({ ...prev, payPeriodStart: start, payPeriodEnd: end, payDate }))
  }

  const set = (field: keyof PaystubData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
    setData((prev) => ({ ...prev, [field]: val }))
  }

  // Auto-calc for hourly mode
  useEffect(() => {
    if (data.payType !== 'hourly') return
    const gross = data.hourlyRate * data.hoursWorked + data.overtimeHours * (data.overtimeRate || data.hourlyRate * 1.5)
    const ss = parseFloat((gross * 0.062).toFixed(2))
    const medicare = parseFloat((gross * 0.0145).toFixed(2))
    setData((prev) => ({ ...prev, grossPay: gross, socialSecurity: ss, medicare }))
  }, [data.hourlyRate, data.hoursWorked, data.overtimeHours, data.overtimeRate, data.payType])

  // Auto-calc SS/Medicare for salary mode
  useEffect(() => {
    if (data.payType !== 'salary') return
    const ss = parseFloat((data.grossPay * 0.062).toFixed(2))
    const medicare = parseFloat((data.grossPay * 0.0145).toFixed(2))
    setData((prev) => ({ ...prev, socialSecurity: ss, medicare }))
  }, [data.grossPay, data.payType])

  const totalDed = data.federalTax + data.stateTax + data.socialSecurity + data.medicare + data.healthInsurance + data.otherDeduction
  const netPay = data.grossPay - totalDed
  const canSubmit = !loading && !!data.empName && !!data.companyName

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: doc, error } = await supabase
        .from('paydocs_documents')
        .insert({ user_id: user?.id ?? null, type: 'paystub', data_json: data as unknown as Record<string, unknown>, paid: false })
        .select().single()
      if (error) throw error
      router.push(`/checkout?docId=${doc.id}&type=paystub`)
    } catch (err) {
      console.error(err)
      alert('Error saving document. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const SummaryCard = () => (
    <div className="card border-ink">
      <div className="section-title">{lang === 'en' ? 'Summary' : 'Resumen'}</div>
      <div className="font-display text-2xl text-ink mb-1">{data.empName || '—'}</div>
      <div className="font-mono text-xs text-gray-400 mb-4">{data.companyName || '—'}</div>
      <div className="space-y-2 font-mono text-sm">
        {[
          [t('gross_pay'), fmt(data.grossPay), false],
          [t('federal_tax'), fmt(data.federalTax), true],
          [`${t('state_tax')} (${data.stateCode})`, fmt(data.stateTax), true],
          [t('social_security'), fmt(data.socialSecurity), true],
          [t('medicare'), fmt(data.medicare), true],
          ...(data.healthInsurance > 0 ? [[t('health_insurance'), fmt(data.healthInsurance), true]] : []),
          ...(data.otherDeduction > 0 ? [[data.otherDeductionLabel || t('other_deduction'), fmt(data.otherDeduction), true]] : []),
        ].map(([label, val, isDed]) => (
          <div key={label as string} className="flex justify-between">
            <span className="text-gray-500">{label as string}</span>
            <span className={isDed ? 'text-red-500' : 'text-ink'}>{isDed ? `– ${val}` : val as string}</span>
          </div>
        ))}
        <div className="border-t border-gray-100 pt-2 flex justify-between font-medium">
          <span className="text-gray-500">{t('total_deductions')}</span>
          <span className="text-red-500">– {fmt(totalDed)}</span>
        </div>
        <div className="border-t-2 border-ink pt-2 flex justify-between text-base">
          <span className="font-medium">{t('net_pay')}</span>
          <span className="text-ink font-medium">{fmt(netPay)}</span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-28 lg:pb-10">
      {/* Header */}
      <div className="mb-6">
        <div className="font-mono text-[10px] uppercase tracking-[4px] text-gray-400 mb-2">
          {lang === 'en' ? 'Step 1 of 2 — Fill Details' : 'Paso 1 de 2 — Completa los detalles'}
        </div>
        <h1 className="font-display text-3xl sm:text-4xl text-ink">{t('hero_paystub')}</h1>
        <p className="font-mono text-sm text-gray-400 mt-1">{t('price_paystub')}</p>
      </div>

      {/* Mobile summary toggle */}
      <button
        className="lg:hidden w-full mb-4 card border-ink flex items-center justify-between hover:border-ink/60 active:scale-[0.99] transition-all"
        style={{ minHeight: '56px' }}
        onClick={() => setShowSummary(!showSummary)}
        aria-expanded={showSummary}
        aria-controls="mobile-summary"
      >
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-gray-400">{t('net_pay')}</div>
          <div className="font-display text-2xl text-ink">{fmt(netPay)}</div>
        </div>
        <span className="font-mono text-xs text-gray-500">{showSummary ? '▲ Hide' : '▼ Show'}</span>
      </button>
      {showSummary && <div id="mobile-summary" className="lg:hidden mb-4"><SummaryCard /></div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* FORM */}
        <div className="space-y-6">
          {/* Employer */}
          <div className="card">
            <div className="section-title">{t('employer_info')}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <FormField label={t('company_name')} value={data.companyName} onChange={set('companyName')} />
              </div>
              <div className="sm:col-span-2">
                <FormField label={t('company_address')} value={data.companyAddress} onChange={set('companyAddress')} />
              </div>
              <div className="sm:col-span-2">
                <FormField label={t('company_city')} value={data.companyCity} onChange={set('companyCity')} placeholder="Beltsville, MD 20705" />
              </div>
              <FormField label={t('ein')} value={data.companyEIN} onChange={set('companyEIN')} placeholder="XX-XXXXXXX" />
            </div>
          </div>

          {/* Employee */}
          <div className="card">
            <div className="section-title">{t('employee_info')}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <FormField label={t('emp_name')} value={data.empName} onChange={set('empName')} />
              </div>
              <div className="sm:col-span-2">
                <FormField label={t('emp_address')} value={data.empAddress} onChange={set('empAddress')} />
              </div>
              <div className="sm:col-span-2">
                <FormField label={t('emp_city')} value={data.empCity} onChange={set('empCity')} />
              </div>
              <FormField label={t('emp_ssn')} value={data.empSSN} onChange={set('empSSN')} placeholder="***-**-XXXX" />
              <div>
                <label className="label">{t('filing_status')}</label>
                <select value={data.empFilingStatus} onChange={set('empFilingStatus')} className="input-field">
                  <option>Single</option>
                  <option>Married</option>
                  <option>Head of Household</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pay Period */}
          <div className="card">
            <div className="section-title">{t('pay_period')}</div>
            {/* Quick-fill frequency presets */}
            <div className="mb-3">
              <label className="label">Quick-fill pay period</label>
              <div className="flex flex-wrap gap-2">
                {(['weekly', 'biweekly', 'semimonthly', 'monthly'] as Freq[]).map(freq => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => applyFreq(freq)}
                    className="px-3 py-1.5 rounded border border-gray-200 font-mono text-xs text-gray-600 hover:border-ink hover:text-ink active:scale-[0.97] transition-all"
                  >
                    {freq === 'weekly' ? 'Weekly' : freq === 'biweekly' ? 'Bi-weekly' : freq === 'semimonthly' ? 'Semi-monthly' : 'Monthly'}
                  </button>
                ))}
              </div>
              <p className="font-mono text-[10px] text-gray-400 mt-1.5">Auto-fills dates based on most recent completed period</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label={t('pay_period_start')} value={data.payPeriodStart} onChange={set('payPeriodStart')} type="date" />
              <FormField label={t('pay_period_end')} value={data.payPeriodEnd} onChange={set('payPeriodEnd')} type="date" />
              <FormField label={t('pay_date')} value={data.payDate} onChange={set('payDate')} type="date" />
              <FormField label={t('check_number')} value={data.checkNumber} onChange={set('checkNumber')} placeholder="#00001" />
            </div>
          </div>

          {/* Earnings */}
          <div className="card">
            <div className="section-title">{t('earnings')}</div>
            <div className="mb-3">
              <label className="label">{t('pay_type')}</label>
              <select value={data.payType} onChange={set('payType')} className="input-field">
                <option value="hourly">{t('hourly')}</option>
                <option value="salary">{t('salary')}</option>
              </select>
            </div>
            {data.payType === 'hourly' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label={t('hourly_rate')} value={data.hourlyRate} onChange={set('hourlyRate')} type="number" />
                <FormField label={t('hours_worked')} value={data.hoursWorked} onChange={set('hoursWorked')} type="number" />
                <FormField label={t('overtime_hours')} value={data.overtimeHours} onChange={set('overtimeHours')} type="number" />
                <FormField label={t('overtime_rate')} value={data.overtimeRate} onChange={set('overtimeRate')} type="number" placeholder="Auto: 1.5×" />
              </div>
            ) : (
              <FormField label={t('gross_pay')} value={data.grossPay} onChange={set('grossPay')} type="number" />
            )}
            <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-100 flex items-center justify-between">
              <span className="font-mono text-xs text-gray-500 uppercase tracking-wider">{t('gross_pay')}</span>
              <span className="font-mono text-sm font-medium text-ink">{fmt(data.grossPay)}</span>
            </div>
          </div>

          {/* Deductions */}
          <div className="card">
            <div className="section-title">{t('deductions')}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label={t('federal_tax')} value={data.federalTax} onChange={set('federalTax')} type="number" />
              <div>
                <label className="label">{t('state')}</label>
                <input value={data.stateCode} onChange={set('stateCode') as React.ChangeEventHandler<HTMLInputElement>} className="input-field" placeholder="MD" maxLength={2} />
              </div>
              <FormField label={t('state_tax')} value={data.stateTax} onChange={set('stateTax')} type="number" />
              <FormField label={t('social_security')} value={data.socialSecurity} onChange={set('socialSecurity')} type="number" readOnly />
              <FormField label={t('medicare')} value={data.medicare} onChange={set('medicare')} type="number" readOnly />
              <FormField label={t('health_insurance')} value={data.healthInsurance} onChange={set('healthInsurance')} type="number" />
              <FormField label={t('other_label')} value={data.otherDeductionLabel} onChange={set('otherDeductionLabel')} />
              <FormField label={t('other_deduction')} value={data.otherDeduction} onChange={set('otherDeduction')} type="number" />
            </div>
          </div>

          {/* YTD */}
          <div className="card">
            <div className="section-title">{t('ytd_section')}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label={t('ytd_gross')} value={data.ytdGross} onChange={set('ytdGross')} type="number" />
              <FormField label={t('ytd_federal')} value={data.ytdFederal} onChange={set('ytdFederal')} type="number" />
              <FormField label={t('ytd_state')} value={data.ytdState} onChange={set('ytdState')} type="number" />
              <FormField label={t('ytd_ss')} value={data.ytdSS} onChange={set('ytdSS')} type="number" />
              <FormField label={t('ytd_medicare')} value={data.ytdMedicare} onChange={set('ytdMedicare')} type="number" />
              <FormField label={t('ytd_net')} value={data.ytdNet} onChange={set('ytdNet')} type="number" />
            </div>
          </div>
        </div>

        {/* SIDEBAR — desktop only */}
        <div className="hidden lg:block lg:sticky lg:top-6 h-fit space-y-4">
          <SummaryCard />
          <button
            onClick={handlePreview}
            disabled={previewing}
            aria-busy={previewing}
            className="w-full py-2.5 rounded border border-gray-300 font-mono text-sm text-gray-600 hover:border-ink hover:text-ink active:scale-[0.98] transition-all"
          >
            {previewing ? 'Generating preview…' : '👁 Preview with watermark'}
          </button>
          <button onClick={handleSubmit} disabled={!canSubmit} aria-busy={loading} className="btn-primary w-full">
            {loading ? (lang === 'en' ? 'Saving...' : 'Guardando...') : t('continue_payment')} →
          </button>
          <p className="font-mono text-[10px] text-center text-gray-400 uppercase tracking-wider">
            {t('price_paystub')} · Stripe secured
          </p>
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex items-center gap-3 z-40">
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-wider text-gray-400">{t('net_pay')}</div>
          <div className="font-display text-xl text-ink truncate">{fmt(netPay)}</div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          aria-busy={loading}
          className="btn-primary shrink-0"
        >
          {loading ? (lang === 'en' ? 'Saving...' : 'Guardando...') : `${t('continue_payment')} →`}
        </button>
      </div>
    </div>
  )
}

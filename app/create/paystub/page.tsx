'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/components/ui/LanguageContext'
import { FormField } from '@/components/ui/FormField'
import type { PaystubData } from '@/types'
import { createClient } from '@/lib/supabase'

type Freq = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'

const PERIODS: Record<Freq, number> = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 }
const FREQ_LABEL: Record<Freq, string> = { weekly: 'Weekly', biweekly: 'Bi-weekly', semimonthly: 'Semi-monthly', monthly: 'Monthly' }

// ── Tax helpers ────────────────────────────────────────────────────────────

function brackets(taxable: number, table: [number, number][]): number {
  let tax = 0, prev = 0
  for (const [cap, rate] of table) {
    if (taxable <= prev) break
    tax += (Math.min(taxable, cap) - prev) * rate
    prev = cap
  }
  return tax
}

// 2025 IRS Publication 15-T percentage method
function calcFederalTax(gross: number, filing: string, freq: Freq): number {
  if (gross <= 0) return 0
  const n = PERIODS[freq]
  const annual = gross * n
  const stdDed = filing === 'Married' ? 30000 : filing === 'Head of Household' ? 22500 : 15000
  const taxable = Math.max(0, annual - stdDed)
  const table: [number, number][] = filing === 'Married'
    ? [[23850,.10],[96950,.12],[206700,.22],[394600,.24],[501050,.32],[751600,.35],[Infinity,.37]]
    : [[11925,.10],[48475,.12],[103350,.22],[197300,.24],[250525,.32],[626350,.35],[Infinity,.37]]
  return parseFloat(Math.max(0, brackets(taxable, table) / n).toFixed(2))
}

// Simplified state withholding using 2024/2025 rates
function calcStateTax(gross: number, state: string, freq: Freq): number {
  if (gross <= 0) return 0
  const n = PERIODS[freq]
  const annual = gross * n
  const s = state.toUpperCase().trim()
  if (['AK','FL','NV','SD','TX','WY','WA','TN','NH'].includes(s)) return 0
  const flat: Record<string, number> = {
    AZ:.025, CO:.044, GA:.0549, IL:.0495, IN:.0305, KY:.040,
    MA:.050, MI:.0425, NC:.045, PA:.0307, SC:.065, UT:.0465, VA:.0575,
  }
  if (flat[s] !== undefined) return parseFloat((annual * flat[s] / n).toFixed(2))
  let annualTax = 0
  switch (s) {
    case 'CA':
      annualTax = brackets(annual, [[10756,.01],[25499,.02],[40245,.04],[55866,.06],[70606,.08],[360659,.093],[Infinity,.103]])
      break
    case 'MD':
      annualTax = brackets(annual, [[1000,.02],[2000,.03],[3000,.04],[100000,.0475],[125000,.05],[150000,.0525],[250000,.055],[Infinity,.0575]])
      break
    case 'NJ':
      annualTax = brackets(annual, [[20000,.014],[35000,.0175],[40000,.035],[75000,.05525],[500000,.0637],[Infinity,.1075]])
      break
    case 'NY':
      annualTax = brackets(annual, [[17150,.04],[23600,.045],[27900,.0525],[161550,.055],[323200,.06],[Infinity,.0685]])
      break
    case 'OH':
      annualTax = brackets(annual, [[26050,0],[100000,.0275],[115300,.03226],[Infinity,.0399]])
      break
    case 'WI':
      annualTax = brackets(annual, [[14320,.0354],[28640,.0465],[315310,.053],[Infinity,.0765]])
      break
    default:
      annualTax = annual * 0.05
  }
  return parseFloat(Math.max(0, annualTax / n).toFixed(2))
}

// ── Date helpers ───────────────────────────────────────────────────────────

const iso = (d: Date) => d.toISOString().split('T')[0]
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }

function nextFriAfter(d: Date): Date {
  const r = addDays(d, 1)
  const dow = r.getDay()
  if (dow !== 5) r.setDate(r.getDate() + ((5 - dow + 7) % 7))
  return r
}

// Given a start date and frequency, compute end date and pay date
function calcEndFromStart(start: string, freq: Freq): { end: string; payDate: string } {
  const s = new Date(start + 'T12:00:00')
  switch (freq) {
    case 'weekly':
      return { end: iso(addDays(s, 6)), payDate: iso(nextFriAfter(addDays(s, 6))) }
    case 'biweekly':
      return { end: iso(addDays(s, 13)), payDate: iso(nextFriAfter(addDays(s, 13))) }
    case 'semimonthly': {
      const d = s.getDate()
      if (d <= 15) return { end: iso(new Date(s.getFullYear(), s.getMonth(), 15)), payDate: iso(new Date(s.getFullYear(), s.getMonth(), 20)) }
      return { end: iso(new Date(s.getFullYear(), s.getMonth() + 1, 0)), payDate: iso(new Date(s.getFullYear(), s.getMonth() + 1, 5)) }
    }
    case 'monthly':
      return { end: iso(new Date(s.getFullYear(), s.getMonth() + 1, 0)), payDate: iso(new Date(s.getFullYear(), s.getMonth() + 1, 5)) }
  }
}

// Quick-fill: most recent completed period relative to today
function calcPayPeriod(freq: Freq): { start: string; end: string; payDate: string } {
  const today = new Date()
  const dow = today.getDay()
  const lastFri = addDays(today, -(((dow + 2) % 7) + 1))
  if (freq === 'weekly') {
    const start = iso(addDays(lastFri, -6))
    return { start, ...calcEndFromStart(start, freq) }
  }
  if (freq === 'biweekly') {
    const start = iso(addDays(lastFri, -13))
    return { start, ...calcEndFromStart(start, freq) }
  }
  if (freq === 'semimonthly') {
    const d = today.getDate(), y = today.getFullYear(), m = today.getMonth()
    const start = d <= 15
      ? iso(new Date(m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1, 16))
      : iso(new Date(y, m, 1))
    return { start, ...calcEndFromStart(start, freq) }
  }
  // monthly
  const y = today.getFullYear(), m = today.getMonth()
  const start = iso(new Date(m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1, 1))
  return { start, ...calcEndFromStart(start, freq) }
}

// ── Component ──────────────────────────────────────────────────────────────

const DEFAULT: PaystubData = {
  companyName: '', companyAddress: '', companyCity: '', companyEIN: '',
  empName: '', empAddress: '', empCity: '', empSSN: '',
  empFilingStatus: 'Single',
  payPeriodStart: '', payPeriodEnd: '', payDate: '', checkNumber: '',
  payType: 'hourly', payFrequency: 'biweekly',
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
      window.open(URL.createObjectURL(await res.blob()), '_blank')
    } catch {
      alert('Could not generate preview. Please try again.')
    } finally {
      setPreviewing(false)
    }
  }

  const applyFreq = (freq: Freq) => {
    const { start, end, payDate } = calcPayPeriod(freq)
    setData(prev => ({ ...prev, payFrequency: freq, payPeriodStart: start, payPeriodEnd: end, payDate }))
  }

  const set = (field: keyof PaystubData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
    setData((prev) => ({ ...prev, [field]: val }))
  }

  // When start date changes, auto-update end + payDate based on selected frequency
  useEffect(() => {
    if (!data.payPeriodStart) return
    const freq = (data.payFrequency || 'biweekly') as Freq
    const { end, payDate } = calcEndFromStart(data.payPeriodStart, freq)
    setData(prev => {
      if (prev.payPeriodEnd === end && prev.payDate === payDate) return prev
      return { ...prev, payPeriodEnd: end, payDate }
    })
  }, [data.payPeriodStart, data.payFrequency])

  // Auto-calc gross + FICA for hourly mode
  useEffect(() => {
    if (data.payType !== 'hourly') return
    const gross = data.hourlyRate * data.hoursWorked + data.overtimeHours * (data.overtimeRate || data.hourlyRate * 1.5)
    const ss = parseFloat((gross * 0.062).toFixed(2))
    const medicare = parseFloat((gross * 0.0145).toFixed(2))
    setData(prev => ({ ...prev, grossPay: gross, socialSecurity: ss, medicare }))
  }, [data.hourlyRate, data.hoursWorked, data.overtimeHours, data.overtimeRate, data.payType])

  // Auto-calc FICA for salary mode
  useEffect(() => {
    if (data.payType !== 'salary') return
    const ss = parseFloat((data.grossPay * 0.062).toFixed(2))
    const medicare = parseFloat((data.grossPay * 0.0145).toFixed(2))
    setData(prev => ({ ...prev, socialSecurity: ss, medicare }))
  }, [data.grossPay, data.payType])

  // Auto-calc federal + state withholding whenever relevant inputs change
  useEffect(() => {
    const freq = (data.payFrequency || 'biweekly') as Freq
    const fed = calcFederalTax(data.grossPay, data.empFilingStatus, freq)
    const st = calcStateTax(data.grossPay, data.stateCode, freq)
    setData(prev => ({ ...prev, federalTax: fed, stateTax: st }))
  }, [data.grossPay, data.empFilingStatus, data.stateCode, data.payFrequency])

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

            {/* Frequency presets */}
            <div className="mb-4">
              <label className="label">Pay Frequency</label>
              <div className="flex flex-wrap gap-2">
                {(['weekly', 'biweekly', 'semimonthly', 'monthly'] as Freq[]).map(freq => {
                  const active = data.payFrequency === freq
                  return (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => applyFreq(freq)}
                      className={`px-3 py-1.5 rounded border font-mono text-xs transition-all active:scale-[0.97] ${
                        active
                          ? 'bg-ink text-white border-ink'
                          : 'border-gray-200 text-gray-600 hover:border-ink hover:text-ink'
                      }`}
                    >
                      {FREQ_LABEL[freq]}
                    </button>
                  )
                })}
              </div>
              <p className="font-mono text-[10px] text-gray-400 mt-1.5">
                {lang === 'en' ? 'Tap to auto-fill dates for the most recent completed period' : 'Toca para auto-completar fechas del período más reciente'}
              </p>
            </div>

            {/* Dates — end + payDate auto-update when start changes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FormField label={t('pay_period_start')} value={data.payPeriodStart} onChange={set('payPeriodStart')} type="date" />
                <p className="font-mono text-[10px] text-gray-400 mt-1">End &amp; pay date update automatically</p>
              </div>
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
            <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded">
              <p className="font-mono text-[10px] text-blue-700 uppercase tracking-wider">
                {lang === 'en'
                  ? `Auto-estimated · ${FREQ_LABEL[data.payFrequency as Freq] ?? 'Bi-weekly'} · ${data.empFilingStatus} · ${data.stateCode || 'MD'} — edit any field to override`
                  : `Auto-estimado · ${FREQ_LABEL[data.payFrequency as Freq] ?? 'Quincenal'} · ${data.empFilingStatus} · ${data.stateCode || 'MD'} — edita para ajustar`}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FormField label={t('federal_tax')} value={data.federalTax} onChange={set('federalTax')} type="number" />
              </div>
              <div>
                <label className="label">{t('state')}</label>
                <input
                  value={data.stateCode}
                  onChange={set('stateCode') as React.ChangeEventHandler<HTMLInputElement>}
                  className="input-field"
                  placeholder="MD"
                  maxLength={2}
                />
              </div>
              <div>
                <FormField label={t('state_tax')} value={data.stateTax} onChange={set('stateTax')} type="number" />
              </div>
              <div>
                <FormField label={t('social_security')} value={data.socialSecurity} onChange={set('socialSecurity')} type="number" />
                <p className="font-mono text-[10px] text-gray-400 mt-1">6.2% of gross</p>
              </div>
              <div>
                <FormField label={t('medicare')} value={data.medicare} onChange={set('medicare')} type="number" />
                <p className="font-mono text-[10px] text-gray-400 mt-1">1.45% of gross</p>
              </div>
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
        <button onClick={handlePreview} disabled={previewing} aria-busy={previewing} className="shrink-0 px-3 py-2.5 rounded border border-gray-300 font-mono text-sm text-gray-600 hover:border-ink active:scale-[0.97] transition-all">
          {previewing ? '…' : '👁'}
        </button>
        <button onClick={handleSubmit} disabled={!canSubmit} aria-busy={loading} className="btn-primary shrink-0">
          {loading ? (lang === 'en' ? 'Saving...' : 'Guardando...') : `${t('continue_payment')} →`}
        </button>
      </div>
    </div>
  )
}

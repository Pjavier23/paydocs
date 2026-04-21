'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/components/ui/LanguageContext'
import type { PaystubData } from '@/types'
import { createClient } from '@/lib/supabase'

const DEFAULT: PaystubData = {
  companyName: '',
  companyAddress: '',
  companyCity: '',
  companyEIN: '',
  empName: '',
  empAddress: '',
  empCity: '',
  empSSN: '',
  empFilingStatus: 'Single',
  payPeriodStart: '',
  payPeriodEnd: '',
  payDate: '',
  checkNumber: '',
  payType: 'hourly',
  hourlyRate: 0,
  hoursWorked: 80,
  overtimeHours: 0,
  overtimeRate: 0,
  grossPay: 0,
  federalTax: 0,
  stateTax: 0,
  stateCode: 'MD',
  socialSecurity: 0,
  medicare: 0,
  healthInsurance: 0,
  otherDeduction: 0,
  otherDeductionLabel: '',
  ytdGross: 0,
  ytdFederal: 0,
  ytdState: 0,
  ytdSS: 0,
  ytdMedicare: 0,
  ytdNet: 0,
}

const fmt = (n: number) => `$${(n || 0).toFixed(2)}`

export default function PaystubFormPage() {
  const { t, lang } = useLang()
  const router = useRouter()
  const [data, setData] = useState<PaystubData>(DEFAULT)
  const [loading, setLoading] = useState(false)

  const set = (field: keyof PaystubData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
    setData((prev) => ({ ...prev, [field]: val }))
  }

  // Auto-calculate gross, SS, Medicare
  useEffect(() => {
    const gross =
      data.payType === 'hourly'
        ? data.hourlyRate * data.hoursWorked + data.overtimeHours * (data.overtimeRate || data.hourlyRate * 1.5)
        : data.grossPay
    const ss = parseFloat((gross * 0.062).toFixed(2))
    const medicare = parseFloat((gross * 0.0145).toFixed(2))
    setData((prev) => ({ ...prev, grossPay: gross, socialSecurity: ss, medicare }))
  }, [data.hourlyRate, data.hoursWorked, data.overtimeHours, data.overtimeRate, data.payType])

  const totalDed =
    data.federalTax + data.stateTax + data.socialSecurity +
    data.medicare + data.healthInsurance + data.otherDeduction

  const netPay = data.grossPay - totalDed

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Save doc (unpaid) to get ID
      const { data: doc, error } = await supabase
        .from('documents')
        .insert({
          user_id: user?.id ?? null,
          type: 'paystub',
          data_json: data as unknown as Record<string, unknown>,
          paid: false,
        })
        .select()
        .single()

      if (error) throw error

      // Go to checkout
      router.push(`/checkout?docId=${doc.id}&type=paystub`)
    } catch (err) {
      console.error(err)
      alert('Error saving document. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const Field = ({
    label, field, type = 'text', readOnly = false, placeholder = ''
  }: {
    label: string
    field: keyof PaystubData
    type?: string
    readOnly?: boolean
    placeholder?: string
  }) => (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        value={data[field] as string | number}
        onChange={set(field)}
        readOnly={readOnly}
        placeholder={placeholder}
        className={`input-field ${readOnly ? 'bg-gray-50 text-accent font-medium' : ''}`}
      />
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="font-mono text-[10px] uppercase tracking-[4px] text-gray-400 mb-2">
          {lang === 'en' ? 'Step 1 of 2 — Fill Details' : 'Paso 1 de 2 — Completa los detalles'}
        </div>
        <h1 className="font-display text-4xl text-ink">{t('hero_paystub')}</h1>
        <p className="font-mono text-sm text-gray-400 mt-1">{t('price_paystub')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* FORM */}
        <div className="space-y-8">
          {/* Employer */}
          <div className="card">
            <div className="section-title">{t('employer_info')}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Field label={t('company_name')} field="companyName" /></div>
              <div className="col-span-2"><Field label={t('company_address')} field="companyAddress" /></div>
              <div className="col-span-2"><Field label={t('company_city')} field="companyCity" placeholder="Beltsville, MD 20705" /></div>
              <Field label={t('ein')} field="companyEIN" placeholder="XX-XXXXXXX" />
            </div>
          </div>

          {/* Employee */}
          <div className="card">
            <div className="section-title">{t('employee_info')}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Field label={t('emp_name')} field="empName" /></div>
              <div className="col-span-2"><Field label={t('emp_address')} field="empAddress" /></div>
              <div className="col-span-2"><Field label={t('emp_city')} field="empCity" /></div>
              <Field label={t('emp_ssn')} field="empSSN" placeholder="***-**-XXXX" />
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
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('pay_period_start')} field="payPeriodStart" type="date" />
              <Field label={t('pay_period_end')} field="payPeriodEnd" type="date" />
              <Field label={t('pay_date')} field="payDate" type="date" />
              <Field label={t('check_number')} field="checkNumber" placeholder="#00001" />
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
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('hourly_rate')} field="hourlyRate" type="number" />
                <Field label={t('hours_worked')} field="hoursWorked" type="number" />
                <Field label={t('overtime_hours')} field="overtimeHours" type="number" />
                <Field label={t('overtime_rate')} field="overtimeRate" type="number" />
              </div>
            ) : (
              <Field label={t('gross_pay')} field="grossPay" type="number" />
            )}
            <div className="mt-3">
              <Field label={t('gross_pay')} field="grossPay" type="number" readOnly />
            </div>
          </div>

          {/* Deductions */}
          <div className="card">
            <div className="section-title">{t('deductions')}</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('federal_tax')} field="federalTax" type="number" />
              <div>
                <label className="label">{t('state')}</label>
                <input value={data.stateCode} onChange={set('stateCode')} className="input-field" placeholder="MD" />
              </div>
              <Field label={t('state_tax')} field="stateTax" type="number" />
              <Field label={t('social_security')} field="socialSecurity" type="number" readOnly />
              <Field label={t('medicare')} field="medicare" type="number" readOnly />
              <Field label={t('health_insurance')} field="healthInsurance" type="number" />
              <Field label={t('other_label')} field="otherDeductionLabel" />
              <Field label={t('other_deduction')} field="otherDeduction" type="number" />
            </div>
          </div>

          {/* YTD */}
          <div className="card">
            <div className="section-title">{t('ytd_section')}</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('ytd_gross')} field="ytdGross" type="number" />
              <Field label={t('ytd_federal')} field="ytdFederal" type="number" />
              <Field label={t('ytd_state')} field="ytdState" type="number" />
              <Field label={t('ytd_ss')} field="ytdSS" type="number" />
              <Field label={t('ytd_medicare')} field="ytdMedicare" type="number" />
              <Field label={t('ytd_net')} field="ytdNet" type="number" />
            </div>
          </div>
        </div>

        {/* LIVE SUMMARY SIDEBAR */}
        <div className="lg:sticky lg:top-6 h-fit space-y-4">
          <div className="card border-ink">
            <div className="section-title">
              {lang === 'en' ? 'Summary' : 'Resumen'}
            </div>
            <div className="font-display text-2xl text-ink mb-1">{data.empName || '—'}</div>
            <div className="font-mono text-xs text-gray-400 mb-4">{data.companyName || '—'}</div>

            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('gross_pay')}</span>
                <span className="text-ink">{fmt(data.grossPay)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('federal_tax')}</span>
                <span className="text-red-500">– {fmt(data.federalTax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('state_tax')} ({data.stateCode})</span>
                <span className="text-red-500">– {fmt(data.stateTax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('social_security')}</span>
                <span className="text-red-500">– {fmt(data.socialSecurity)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('medicare')}</span>
                <span className="text-red-500">– {fmt(data.medicare)}</span>
              </div>
              {data.healthInsurance > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('health_insurance')}</span>
                  <span className="text-red-500">– {fmt(data.healthInsurance)}</span>
                </div>
              )}
              {data.otherDeduction > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{data.otherDeductionLabel || t('other_deduction')}</span>
                  <span className="text-red-500">– {fmt(data.otherDeduction)}</span>
                </div>
              )}
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

          <button
            onClick={handleSubmit}
            disabled={loading || !data.empName || !data.companyName}
            className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading
              ? (lang === 'en' ? 'Saving...' : 'Guardando...')
              : t('continue_payment')} →
          </button>
          <p className="font-mono text-[10px] text-center text-gray-400 uppercase tracking-wider">
            {t('price_paystub')} · Stripe secured
          </p>
        </div>
      </div>
    </div>
  )
}

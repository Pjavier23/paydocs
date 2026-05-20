'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { BkClient } from '@/types'

type Step = 1 | 2 | 3

export default function OnboardingPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const supabase = createClient()

  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [clientData, setClientData] = useState<BkClient | null>(null)

  const [form, setForm] = useState({
    business_name: '',
    industry: 'contractor',
    ein: '',
    contact_name: '',
  })

  useEffect(() => {
    // Fetch client by invite token
    const fetchClient = async () => {
      const res = await fetch(`/api/bookkeeping/onboard?token=${token}`)
      if (res.ok) {
        const data = await res.json()
        setClientData(data.client)
        setForm(f => ({
          ...f,
          business_name: data.client.business_name || '',
          industry: data.client.industry || 'contractor',
          contact_name: data.client.contact_name || '',
        }))
      } else {
        setError('Invalid or expired invite link.')
      }
      setLoading(false)
    }
    fetchClient()
  }, [token])

  const handleFinish = async () => {
    setSaving(true)
    const res = await fetch('/api/bookkeeping/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...form }),
    })
    if (res.ok) {
      setStep(3)
    } else {
      const err = await res.json()
      setError(err.error || 'Failed to complete setup')
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="min-h-screen bg-paper flex items-center justify-center"><div className="font-mono text-xs text-gray-400">Loading…</div></div>
  }

  if (error && !clientData) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="card max-w-md text-center py-10">
          <div className="text-3xl mb-3">⚠️</div>
          <div className="font-display text-xl text-ink mb-2">Invalid invite</div>
          <p className="font-mono text-xs text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs transition-colors ${
                step >= s ? 'bg-ink text-accent' : 'bg-gray-200 text-gray-400'
              }`}>
                {step > s ? '✓' : s}
              </div>
              {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-ink' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="card">
          {/* Step 1: Business Details */}
          {step === 1 && (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[3px] text-gray-400 mb-1">Step 1 of 3</div>
              <h2 className="font-display text-2xl text-ink mb-6">Business Details</h2>

              <div className="space-y-4">
                <div>
                  <label className="label">Business Name</label>
                  <input
                    className="input-field"
                    value={form.business_name}
                    onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
                    placeholder="Acme Contracting LLC"
                  />
                </div>
                <div>
                  <label className="label">Your Name</label>
                  <input
                    className="input-field"
                    value={form.contact_name}
                    onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="label">Industry</label>
                  <select
                    className="input-field"
                    value={form.industry}
                    onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                  >
                    {[
                      ['contractor', '🔨 General Contractor'],
                      ['cleaning', '🧹 Cleaning'],
                      ['construction', '🏗️ Construction'],
                      ['hvac', '❄️ HVAC'],
                      ['flooring', '🪵 Flooring'],
                      ['other', '💼 Other'],
                    ].map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">EIN / Tax ID (optional)</label>
                  <input
                    className="input-field"
                    value={form.ein}
                    onChange={e => setForm(f => ({ ...f, ein: e.target.value }))}
                    placeholder="12-3456789"
                  />
                </div>
              </div>

              <button onClick={() => setStep(2)} className="btn-primary w-full mt-6">
                Continue →
              </button>
            </div>
          )}

          {/* Step 2: Bank (coming soon) */}
          {step === 2 && (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[3px] text-gray-400 mb-1">Step 2 of 3</div>
              <h2 className="font-display text-2xl text-ink mb-3">Connect Your Bank</h2>
              <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
                <div className="font-mono text-xs text-blue-700">
                  🏦 <strong>Coming soon</strong> — Bank connection via Plaid will be available soon.
                  For now, you can manually upload bank statements as PDFs.
                </div>
              </div>
              <p className="font-mono text-xs text-gray-400 mb-6">
                You can skip this step and upload receipts and invoices manually. Your bookkeeper will handle the rest.
              </p>
              <div className="flex gap-3">
                <button onClick={handleFinish} disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Setting up…' : 'Skip & Finish →'}
                </button>
                <button onClick={() => setStep(1)} className="btn-secondary">
                  Back
                </button>
              </div>
              {error && <div className="mt-3 font-mono text-xs text-red-500">{error}</div>}
            </div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="font-display text-2xl text-ink mb-2">You're all set!</h2>
              <p className="font-mono text-xs text-gray-400 mb-6">
                Your bookkeeping account is ready. Start uploading receipts and we'll take care of the rest.
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-6 text-left">
                <div className="font-mono text-[9px] uppercase tracking-[2px] text-gray-400 mb-2">Your plan</div>
                <div className="font-sans text-sm text-ink">Monthly Bookkeeping</div>
                <div className="font-mono text-xs text-gray-400">$100/mo · First month free</div>
              </div>
              <button onClick={() => router.push('/bookkeeping/client')} className="btn-primary w-full">
                Go to My Dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

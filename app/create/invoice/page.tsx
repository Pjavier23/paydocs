'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/components/ui/LanguageContext'
import { FormField } from '@/components/ui/FormField'
import type { InvoiceData, InvoiceItem } from '@/types'
import { createClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

const today = new Date().toISOString().split('T')[0]
const due30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
const fmt = (n: number) => `$${(n || 0).toFixed(2)}`

const DEFAULT: InvoiceData = {
  fromName: '', fromAddress: '', fromCity: '', fromEmail: '', fromPhone: '',
  toName: '', toAddress: '', toCity: '', toEmail: '',
  invoiceNumber: `INV-${new Date().getFullYear()}-001`,
  invoiceDate: today, dueDate: due30, currency: 'USD',
  items: [{ id: uuidv4(), description: '', quantity: 1, rate: 0, amount: 0 }],
  taxRate: 0, discount: 0,
  notes: '', paymentTerms: 'Net 30',
}

export default function InvoicePage() {
  const { lang } = useLang()
  const router = useRouter()
  const [data, setData] = useState<InvoiceData>(DEFAULT)
  const [loading, setLoading] = useState(false)
  const [previewing, setPreviewing] = useState(false)

  const handlePreview = async () => {
    setPreviewing(true)
    try {
      const res = await fetch('/api/preview-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'invoice', data }),
      })
      if (!res.ok) throw new Error('Preview failed')
      window.open(URL.createObjectURL(await res.blob()), '_blank')
    } catch { alert('Could not generate preview.') }
    finally { setPreviewing(false) }
  }

  const set = useCallback((field: keyof Omit<InvoiceData, 'items'>) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
    setData((prev) => ({ ...prev, [field]: val }))
  }, [])

  const updateItem = useCallback((id: string, field: keyof InvoiceItem, rawVal: string | number) => {
    setData((prev) => {
      const items = prev.items.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: rawVal }
        updated.amount = updated.quantity * updated.rate
        return updated
      })
      return { ...prev, items }
    })
  }, [])

  const addItem = useCallback(() => {
    setData((prev) => ({
      ...prev,
      items: [...prev.items, { id: uuidv4(), description: '', quantity: 1, rate: 0, amount: 0 }],
    }))
  }, [])

  const removeItem = useCallback((id: string) => {
    setData((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }))
  }, [])

  const subtotal = data.items.reduce((s, i) => s + i.amount, 0)
  const discountAmt = data.discount > 0 ? subtotal * (data.discount / 100) : 0
  const taxAmt = data.taxRate > 0 ? (subtotal - discountAmt) * (data.taxRate / 100) : 0
  const total = subtotal - discountAmt + taxAmt

  const canSubmit = !loading && !!data.fromName && !!data.toName && total > 0

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: doc, error } = await supabase
        .from('paydocs_documents')
        .insert({ user_id: user?.id ?? null, type: 'invoice', data_json: data as unknown as Record<string, unknown>, paid: false })
        .select().single()
      if (error) throw error
      router.push(`/checkout?docId=${doc.id}&type=invoice`)
    } catch (err) {
      console.error(err)
      alert('Error saving invoice. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-28 lg:pb-10">
      {/* Header */}
      <div className="mb-6">
        <div className="font-mono text-[10px] uppercase tracking-[4px] text-gray-400 mb-2">
          {lang === 'en' ? 'Create Invoice' : 'Crear Factura'}
        </div>
        <h1 className="font-display text-3xl sm:text-4xl text-ink">
          {lang === 'en' ? 'Professional Invoice' : 'Factura Profesional'}
        </h1>
        <p className="font-mono text-sm text-gray-400 mt-1">$2.99 per invoice · PDF download instantly</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Details */}
          <div className="card">
            <div className="section-title">Invoice Details</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Invoice Number" value={data.invoiceNumber} onChange={set('invoiceNumber')} />
              <div>
                <label className="label">Currency</label>
                <select value={data.currency} onChange={set('currency')} className="input-field">
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="CAD">CAD — Canadian Dollar</option>
                  <option value="MXN">MXN — Mexican Peso</option>
                </select>
              </div>
              <FormField label="Invoice Date" value={data.invoiceDate} onChange={set('invoiceDate')} type="date" />
              <FormField label="Due Date" value={data.dueDate} onChange={set('dueDate')} type="date" />
              <div className="sm:col-span-2">
                <label className="label">Payment Terms</label>
                <select value={data.paymentTerms} onChange={set('paymentTerms')} className="input-field">
                  <option>Due on Receipt</option>
                  <option>Net 15</option>
                  <option>Net 30</option>
                  <option>Net 60</option>
                  <option>Net 90</option>
                </select>
              </div>
            </div>
          </div>

          {/* From / To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card">
              <div className="section-title">From (Your Business)</div>
              <div className="space-y-3">
                <FormField label="Business Name" value={data.fromName} onChange={set('fromName')} />
                <FormField label="Address" value={data.fromAddress} onChange={set('fromAddress')} />
                <FormField label="City, State, ZIP" value={data.fromCity} onChange={set('fromCity')} />
                <FormField label="Email" value={data.fromEmail} onChange={set('fromEmail')} type="email" />
                <FormField label="Phone" value={data.fromPhone} onChange={set('fromPhone')} />
              </div>
            </div>
            <div className="card">
              <div className="section-title">Bill To (Client)</div>
              <div className="space-y-3">
                <FormField label="Client / Company Name" value={data.toName} onChange={set('toName')} />
                <FormField label="Address" value={data.toAddress} onChange={set('toAddress')} />
                <FormField label="City, State, ZIP" value={data.toCity} onChange={set('toCity')} />
                <FormField label="Email" value={data.toEmail} onChange={set('toEmail')} type="email" />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="card">
            <div className="section-title">Line Items</div>

            {/* Desktop table header */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-2 mb-2">
              <div className="sm:col-span-5 label mb-0">Description</div>
              <div className="sm:col-span-2 label mb-0">Qty</div>
              <div className="sm:col-span-2 label mb-0">Rate</div>
              <div className="sm:col-span-2 label mb-0">Amount</div>
              <div className="sm:col-span-1" />
            </div>

            <div className="space-y-4">
              {data.items.map((item) => (
                <div key={item.id} className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-start">
                  {/* Description — full width on mobile, 5 cols on desktop */}
                  <div className="sm:col-span-5">
                    <label className="sm:hidden label">Description</label>
                    <input
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Service or product description"
                      className="input-field"
                    />
                  </div>

                  {/* Qty + Rate row on mobile (2-col), individual on desktop */}
                  <div className="grid grid-cols-2 gap-2 sm:contents">
                    <div className="sm:col-span-2">
                      <label className="label">Qty</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="input-field"
                        aria-label="Quantity"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Rate</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={item.rate}
                        onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        className="input-field"
                        aria-label="Rate"
                      />
                    </div>
                  </div>

                  {/* Amount + Remove row on mobile */}
                  <div className="flex gap-2 items-end sm:contents">
                    <div className="flex-1 sm:col-span-2">
                      <label className="label">Amount</label>
                      <input
                        readOnly
                        value={fmt(item.amount)}
                        className="input-field bg-gray-50 text-gray-700 font-medium"
                        aria-label="Amount"
                      />
                    </div>
                    {/* Remove */}
                    <div className="sm:col-span-1 flex items-end">
                      {data.items.length > 1 && (
                        <button
                          onClick={() => removeItem(item.id)}
                          className="flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors border border-gray-200 rounded"
                          style={{ minHeight: '44px', minWidth: '44px' }}
                          aria-label="Remove line item"
                          title="Remove"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addItem}
              className="mt-4 btn-secondary w-full"
            >
              + Add Line Item
            </button>
          </div>

          {/* Totals */}
          <div className="card">
            <div className="section-title">Totals & Notes</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <FormField
                  label="Tax Rate (%)"
                  value={data.taxRate}
                  onChange={set('taxRate')}
                  type="number"
                  hint="Enter 0 if no tax"
                />
                <FormField
                  label="Discount (%)"
                  value={data.discount}
                  onChange={set('discount')}
                  type="number"
                  hint="Applied before tax"
                />
              </div>
              <div className="bg-gray-50 rounded border border-gray-100 p-4 space-y-2 font-mono text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span><span>{fmt(subtotal)}</span>
                </div>
                {discountAmt > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>Discount ({data.discount}%)</span><span>– {fmt(discountAmt)}</span>
                  </div>
                )}
                {taxAmt > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Tax ({data.taxRate}%)</span><span>{fmt(taxAmt)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 flex justify-between font-medium text-base text-ink">
                  <span>Total</span><span>{data.currency} {fmt(total)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Notes (optional)</label>
                <textarea
                  value={data.notes}
                  onChange={set('notes')}
                  rows={2}
                  placeholder="Thank you for your business!"
                  className="input-field resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block lg:sticky lg:top-6 h-fit space-y-4">
          <div className="card border-ink">
            <div className="section-title">Invoice Summary</div>
            <div className="font-display text-xl text-ink mb-1">{data.toName || '—'}</div>
            <div className="font-mono text-xs text-gray-400 mb-1">{data.fromName || '—'}</div>
            <div className="font-mono text-xs text-gray-400 mb-4">{data.invoiceNumber}</div>
            <div className="space-y-1.5 font-mono text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Items</span><span>{data.items.length}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span><span>{fmt(subtotal)}</span>
              </div>
              {discountAmt > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Discount</span><span>– {fmt(discountAmt)}</span>
                </div>
              )}
              {taxAmt > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Tax</span><span>{fmt(taxAmt)}</span>
                </div>
              )}
              <div className="border-t-2 border-ink pt-2 flex justify-between text-base font-medium">
                <span>Total Due</span>
                <span>{data.currency} {fmt(total)}</span>
              </div>
            </div>
          </div>

          <button onClick={handlePreview} disabled={previewing} aria-busy={previewing} className="w-full py-2.5 rounded border border-gray-300 font-mono text-sm text-gray-600 hover:border-ink hover:text-ink active:scale-[0.98] transition-all">
            {previewing ? 'Generating preview…' : '👁 Preview with watermark'}
          </button>
          <button onClick={handleSubmit} disabled={!canSubmit} aria-busy={loading} className="btn-primary w-full">
            {loading ? 'Saving...' : 'Continue to Payment →'}
          </button>
          <p className="font-mono text-[10px] text-center text-gray-400 uppercase tracking-wider">
            $2.99 · Stripe secured
          </p>
        </div>
      </div>

      {/* Mobile sticky bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex items-center gap-3 z-40">
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-wider text-gray-400">Invoice Total</div>
          <div className="font-display text-xl text-ink">{data.currency} {fmt(total)}</div>
        </div>
        <button onClick={handleSubmit} disabled={!canSubmit} aria-busy={loading} className="btn-primary shrink-0">
          {loading ? 'Saving...' : 'Pay $2.99 →'}
        </button>
      </div>
    </div>
  )
}


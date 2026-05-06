'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

type Tab = 'overview' | 'documents' | 'tax' | 'reports'

const CATEGORY_COLORS: Record<string, string> = {
  materials: 'bg-blue-100 text-blue-700',
  labor: 'bg-purple-100 text-purple-700',
  equipment: 'bg-orange-100 text-orange-700',
  office: 'bg-gray-100 text-gray-700',
  travel: 'bg-cyan-100 text-cyan-700',
  meals: 'bg-pink-100 text-pink-700',
  utilities: 'bg-yellow-100 text-yellow-700',
  other: 'bg-gray-100 text-gray-500',
}

const DOC_TYPE_ICONS: Record<string, string> = {
  receipt: '🧾',
  invoice: '📄',
  bank_statement: '🏦',
  other: '📎',
}

export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.clientId as string
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [taxEvents, setTaxEvents] = useState<any[]>([])
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const loadAll = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }
    const token = session.access_token

    const [clientRes, docsRes, taxRes] = await Promise.all([
      fetch(`/api/bookkeeping/clients`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/api/bookkeeping/documents?client_id=${clientId}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/api/bookkeeping/tax-events?client_id=${clientId}`, { headers: { Authorization: `Bearer ${token}` } }),
    ])

    if (clientRes.ok) {
      const { clients } = await clientRes.json()
      const found = (clients || []).find((c: any) => c.id === clientId)
      if (found) setClient(found)
    }
    if (docsRes.ok) {
      const { documents } = await docsRes.json()
      setDocuments(documents || [])
    }
    if (taxRes.ok) {
      const { events } = await taxRes.json()
      setTaxEvents(events || [])
    }
    setLoading(false)
  }, [clientId])

  useEffect(() => { loadAll() }, [loadAll])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadMsg('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const formData = new FormData()
      formData.append('file', file)
      formData.append('client_id', clientId)
      formData.append('doc_type', 'receipt')

      const res = await fetch('/api/bookkeeping/documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      })

      if (res.ok) {
        setUploadMsg('✓ Uploaded! AI is extracting data…')
        // Reload docs after a moment
        setTimeout(() => { loadAll(); setUploadMsg('') }, 3000)
      } else {
        const err = await res.json()
        setUploadMsg(err.error || 'Upload failed')
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const toggleTaxEvent = async (eventId: string, current: boolean) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/bookkeeping/tax-events', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, completed: !current }),
    })
    setTaxEvents(evts => evts.map(e => e.id === eventId ? { ...e, completed: !current } : e))
  }

  if (loading) {
    return <div className="min-h-screen bg-paper flex items-center justify-center"><div className="font-mono text-xs uppercase tracking-widest text-gray-400">Loading…</div></div>
  }

  // Financial calculations
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const yearStart = new Date(now.getFullYear(), 0, 1)

  const monthDocs = documents.filter(d => d.doc_date && new Date(d.doc_date) >= monthStart)
  const monthIncome = monthDocs.filter(d => d.is_income && d.amount).reduce((s, d) => s + Number(d.amount), 0)
  const monthExpenses = monthDocs.filter(d => !d.is_income && d.amount).reduce((s, d) => s + Number(d.amount), 0)
  const monthNet = monthIncome - monthExpenses

  const ytdDocs = documents.filter(d => d.doc_date && new Date(d.doc_date) >= yearStart)
  const ytdIncome = ytdDocs.filter(d => d.is_income && d.amount).reduce((s, d) => s + Number(d.amount), 0)
  const ytdExpenses = ytdDocs.filter(d => !d.is_income && d.amount).reduce((s, d) => s + Number(d.amount), 0)

  // Category breakdown
  const categoryTotals = documents
    .filter(d => !d.is_income && d.amount && d.category)
    .reduce((acc: Record<string, number>, d) => {
      acc[d.category] = (acc[d.category] || 0) + Number(d.amount)
      return acc
    }, {})

  const upcomingTax = taxEvents.filter(e => !e.completed && new Date(e.due_date) >= now)
  const overdueTax = taxEvents.filter(e => !e.completed && new Date(e.due_date) < now)

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 font-mono text-xs text-gray-400 mb-8">
          <Link href="/bookkeeping" className="hover:text-ink">Bookkeeping</Link>
          <span>/</span>
          <span className="text-ink">{client?.business_name || 'Client'}</span>
        </div>

        {/* Client header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-display text-4xl text-ink mb-1">{client?.business_name}</h1>
            <div className="flex items-center gap-3 text-gray-400 font-mono text-xs">
              {client?.contact_name && <span>{client.contact_name}</span>}
              {client?.email && <span>· {client.email}</span>}
              {client?.industry && <span>· {client.industry}</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-xs text-gray-400">Monthly fee</div>
            <div className="font-display text-2xl text-ink">${client?.monthly_fee || 100}/mo</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 mb-8">
          {(['overview', 'documents', 'tax', 'reports'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`font-mono text-[10px] uppercase tracking-widest px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab ? 'border-ink text-ink' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Income (this month)', value: `$${monthIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: 'text-green-600' },
                { label: 'Expenses (this month)', value: `$${monthExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: 'text-red-500' },
                { label: 'Net Profit (MTD)', value: `$${monthNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: monthNet >= 0 ? 'text-green-600' : 'text-red-500' },
                { label: 'YTD Expenses', value: `$${ytdExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: 'text-ink' },
              ].map(stat => (
                <div key={stat.label} className="card">
                  <div className="font-mono text-[9px] uppercase tracking-[2px] text-gray-400 mb-1">{stat.label}</div>
                  <div className={`font-display text-2xl ${stat.color}`}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Recent docs */}
            <div className="card">
              <div className="section-title">Recent Documents</div>
              {documents.length === 0 ? (
                <p className="font-mono text-xs text-gray-400 py-4 text-center">No documents yet. Upload receipts to get started.</p>
              ) : (
                <div className="space-y-2">
                  {documents.slice(0, 5).map(doc => (
                    <div key={doc.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{DOC_TYPE_ICONS[doc.doc_type] || '📎'}</span>
                        <div>
                          <div className="font-sans text-sm text-ink">{doc.vendor || doc.description || 'Unknown'}</div>
                          <div className="font-mono text-[10px] text-gray-400">
                            {doc.doc_date ? new Date(doc.doc_date).toLocaleDateString() : new Date(doc.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {doc.category && (
                          <span className={`font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full ${CATEGORY_COLORS[doc.category] || 'bg-gray-100 text-gray-500'}`}>
                            {doc.category}
                          </span>
                        )}
                        {doc.amount && (
                          <div className={`font-mono text-sm font-medium ${doc.is_income ? 'text-green-600' : 'text-red-500'}`}>
                            {doc.is_income ? '+' : '-'}${Number(doc.amount).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming tax */}
            {upcomingTax.length > 0 && (
              <div className="card border-yellow-200 bg-yellow-50">
                <div className="section-title">⚠️ Upcoming Tax Deadlines</div>
                {upcomingTax.slice(0, 3).map(event => (
                  <div key={event.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-sans text-sm font-medium text-ink">{event.title}</div>
                      <div className="font-mono text-xs text-gray-500">{event.description}</div>
                    </div>
                    <div className="font-mono text-sm text-yellow-700">
                      {new Date(event.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DOCUMENTS TAB ── */}
        {activeTab === 'documents' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="font-mono text-sm text-gray-500">{documents.length} document{documents.length !== 1 ? 's' : ''}</div>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className={`btn-primary cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {uploading ? 'Uploading…' : '↑ Upload Document'}
                </label>
              </div>
            </div>

            {uploadMsg && (
              <div className={`font-mono text-xs p-3 rounded mb-4 ${uploadMsg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {uploadMsg}
              </div>
            )}

            {documents.length === 0 ? (
              <div className="card text-center py-16">
                <div className="text-4xl mb-3">🧾</div>
                <div className="font-display text-xl text-ink mb-1">No documents yet</div>
                <p className="font-mono text-xs text-gray-400">Upload receipts, invoices, and bank statements.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {documents.map(doc => (
                  <div key={doc.id} className="card hover:border-gray-300 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl flex-shrink-0">{DOC_TYPE_ICONS[doc.doc_type] || '📎'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-sans text-sm font-medium text-ink truncate">
                            {doc.vendor || 'Unknown vendor'}
                          </div>
                          {doc.amount && (
                            <div className={`font-mono text-sm font-bold flex-shrink-0 ${doc.is_income ? 'text-green-600' : 'text-red-500'}`}>
                              {doc.is_income ? '+' : '-'}${Number(doc.amount).toFixed(2)}
                            </div>
                          )}
                        </div>
                        {doc.description && (
                          <div className="font-mono text-xs text-gray-400 mt-0.5 line-clamp-1">{doc.description}</div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {doc.category && (
                            <span className={`font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full ${CATEGORY_COLORS[doc.category] || 'bg-gray-100 text-gray-500'}`}>
                              {doc.category}
                            </span>
                          )}
                          <span className="font-mono text-[9px] text-gray-300">
                            {doc.doc_date
                              ? new Date(doc.doc_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          {doc.ai_processed && (
                            <span className="font-mono text-[9px] text-green-500">✓ AI</span>
                          )}
                          {!doc.ai_processed && (
                            <span className="font-mono text-[9px] text-yellow-500">⏳ Processing</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAX TAB ── */}
        {activeTab === 'tax' && (
          <div className="space-y-4">
            {overdueTax.length > 0 && (
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[3px] text-red-500 mb-3">⚠️ Overdue</div>
                {overdueTax.map(event => (
                  <TaxEventRow key={event.id} event={event} onToggle={toggleTaxEvent} overdue />
                ))}
              </div>
            )}

            {upcomingTax.length > 0 && (
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[3px] text-gray-400 mb-3">Upcoming</div>
                {upcomingTax.map(event => (
                  <TaxEventRow key={event.id} event={event} onToggle={toggleTaxEvent} />
                ))}
              </div>
            )}

            {taxEvents.filter(e => e.completed).length > 0 && (
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[3px] text-gray-300 mb-3">Completed</div>
                {taxEvents.filter(e => e.completed).map(event => (
                  <TaxEventRow key={event.id} event={event} onToggle={toggleTaxEvent} />
                ))}
              </div>
            )}

            {taxEvents.length === 0 && (
              <div className="card text-center py-10 text-gray-400 font-mono text-sm">No tax events. They're auto-created when you add a client.</div>
            )}
          </div>
        )}

        {/* ── REPORTS TAB ── */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* P&L Summary */}
            <div className="card">
              <div className="section-title">Profit & Loss — {new Date().getFullYear()}</div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[2px] text-green-500 mb-1">Total Income (YTD)</div>
                  <div className="font-display text-2xl text-green-600">${ytdIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[2px] text-red-400 mb-1">Total Expenses (YTD)</div>
                  <div className="font-display text-2xl text-red-500">${ytdExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[2px] text-gray-400 mb-1">Net Profit (YTD)</div>
                  <div className={`font-display text-2xl ${(ytdIncome - ytdExpenses) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    ${(ytdIncome - ytdExpenses).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* Expense breakdown by category */}
            <div className="card">
              <div className="section-title">Expenses by Category</div>
              {Object.keys(categoryTotals).length === 0 ? (
                <p className="font-mono text-xs text-gray-400 py-4">No categorized expenses yet.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(categoryTotals)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, total]) => {
                      const maxVal = Math.max(...Object.values(categoryTotals))
                      const pct = maxVal > 0 ? (total / maxVal) * 100 : 0
                      return (
                        <div key={category}>
                          <div className="flex justify-between items-center mb-1">
                            <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-500'}`}>
                              {category}
                            </span>
                            <span className="font-mono text-sm text-ink">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-ink rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>

            {/* Tax deductible summary */}
            <div className="card">
              <div className="section-title">Tax Deductible Expenses</div>
              <div className="flex justify-between items-center">
                <span className="font-mono text-sm text-gray-500">Total deductible expenses (YTD)</span>
                <span className="font-display text-2xl text-ink">
                  ${ytdDocs.filter(d => !d.is_income && d.tax_deductible && d.amount).reduce((s, d) => s + Number(d.amount), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TaxEventRow({ event, onToggle, overdue }: { event: any; onToggle: (id: string, completed: boolean) => void; overdue?: boolean }) {
  return (
    <div className={`card mb-2 flex items-start gap-4 ${event.completed ? 'opacity-50' : ''} ${overdue ? 'border-red-200' : ''}`}>
      <button
        onClick={() => onToggle(event.id, event.completed)}
        className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          event.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-ink'
        }`}
      >
        {event.completed && '✓'}
      </button>
      <div className="flex-1">
        <div className={`font-sans text-sm font-medium ${event.completed ? 'line-through text-gray-400' : 'text-ink'}`}>
          {event.title}
        </div>
        {event.description && (
          <div className="font-mono text-xs text-gray-400 mt-0.5">{event.description}</div>
        )}
      </div>
      <div className={`font-mono text-xs flex-shrink-0 ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
        {new Date(event.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>
    </div>
  )
}

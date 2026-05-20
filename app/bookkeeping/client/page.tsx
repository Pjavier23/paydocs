'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { BkClient, BkDocument, BkTaxEvent } from '@/types'

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

export default function ClientSelfView() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [clientData, setClientData] = useState<BkClient | null>(null)
  const [documents, setDocuments] = useState<BkDocument[]>([])
  const [taxEvents, setTaxEvents] = useState<BkTaxEvent[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'tax'>('overview')
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }
    const token = session.access_token

    // Find the client record where uploaded_by or similar matches the user
    // For now, we find via documents that belong to this user
    const adminRes = await fetch('/api/bookkeeping/client-self', {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (adminRes.ok) {
      const data = await adminRes.json()
      setClientData(data.client)
      setDocuments(data.documents || [])
      setTaxEvents(data.taxEvents || [])
    }

    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !clientData) return
    setUploading(true)
    setUploadMsg('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const formData = new FormData()
      formData.append('file', file)
      formData.append('client_id', clientData.id)
      formData.append('doc_type', 'receipt')

      const res = await fetch('/api/bookkeeping/documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      })

      if (res.ok) {
        setUploadMsg('✓ Uploaded! AI is processing it…')
        setTimeout(() => { load(); setUploadMsg('') }, 3000)
      } else {
        const err = await res.json()
        setUploadMsg(err.error || 'Upload failed')
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-paper flex items-center justify-center"><div className="font-mono text-xs text-gray-400">Loading…</div></div>
  }

  if (!clientData) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="card max-w-md text-center py-10">
          <div className="text-3xl mb-3">📋</div>
          <div className="font-display text-xl text-ink mb-2">No bookkeeping account found</div>
          <p className="font-mono text-xs text-gray-400">Ask your bookkeeper to set up your account and send you an invite.</p>
        </div>
      </div>
    )
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthExpenses = documents
    .filter(d => !d.is_income && d.amount && d.doc_date && new Date(d.doc_date) >= monthStart)
    .reduce((s, d) => s + Number(d.amount), 0)
  const monthIncome = documents
    .filter(d => d.is_income && d.amount && d.doc_date && new Date(d.doc_date) >= monthStart)
    .reduce((s, d) => s + Number(d.amount), 0)

  const upcoming = taxEvents.filter(e => !e.completed && new Date(e.due_date) >= now)

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="font-mono text-[10px] uppercase tracking-[3px] text-gray-400 mb-1">My Bookkeeping</div>
          <h1 className="font-display text-4xl text-ink">{clientData.business_name}</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 mb-8">
          {(['overview', 'documents', 'tax'] as const).map(tab => (
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

        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="card">
                <div className="font-mono text-[9px] uppercase tracking-[2px] text-green-500 mb-1">Income (MTD)</div>
                <div className="font-display text-2xl text-green-600">${monthIncome.toFixed(2)}</div>
              </div>
              <div className="card">
                <div className="font-mono text-[9px] uppercase tracking-[2px] text-red-400 mb-1">Expenses (MTD)</div>
                <div className="font-display text-2xl text-red-500">${monthExpenses.toFixed(2)}</div>
              </div>
              <div className="card">
                <div className="font-mono text-[9px] uppercase tracking-[2px] text-gray-400 mb-1">Net (MTD)</div>
                <div className={`font-display text-2xl ${monthIncome - monthExpenses >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  ${(monthIncome - monthExpenses).toFixed(2)}
                </div>
              </div>
            </div>

            {upcoming.length > 0 && (
              <div className="card border-yellow-200 bg-yellow-50">
                <div className="section-title">📅 Upcoming Tax Deadlines</div>
                {upcoming.slice(0, 3).map(e => (
                  <div key={e.id} className="flex justify-between py-2">
                    <div className="font-sans text-sm text-ink">{e.title}</div>
                    <div className="font-mono text-xs text-yellow-700">
                      {new Date(e.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="card">
              <div className="section-title">Upload Documents</div>
              <p className="font-mono text-xs text-gray-400 mb-4">
                Snap a photo of your receipts or invoices. We'll extract the details automatically.
              </p>
              <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleUpload} className="hidden" id="client-upload" />
              <label htmlFor="client-upload" className={`btn-primary cursor-pointer inline-block ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                {uploading ? 'Uploading…' : '📎 Upload Receipt or Invoice'}
              </label>
              {uploadMsg && <div className="mt-3 font-mono text-xs text-green-600">{uploadMsg}</div>}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="font-mono text-sm text-gray-500">{documents.length} document{documents.length !== 1 ? 's' : ''}</div>
              <div>
                <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleUpload} className="hidden" id="docs-upload" />
                <label htmlFor="docs-upload" className={`btn-primary cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {uploading ? '…' : '↑ Upload'}
                </label>
              </div>
            </div>
            {documents.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-3xl mb-2">🧾</div>
                <div className="font-mono text-xs text-gray-400">No documents uploaded yet.</div>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="card flex items-center justify-between">
                    <div>
                      <div className="font-sans text-sm text-ink">{doc.vendor || 'Unknown'}</div>
                      <div className="font-mono text-xs text-gray-400">
                        {doc.doc_date ? new Date(doc.doc_date).toLocaleDateString() : new Date(doc.created_at).toLocaleDateString()}
                        {doc.category && ` · ${doc.category}`}
                      </div>
                    </div>
                    {doc.amount && (
                      <div className={`font-mono text-sm font-bold ${doc.is_income ? 'text-green-600' : 'text-red-500'}`}>
                        {doc.is_income ? '+' : '-'}${Number(doc.amount).toFixed(2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tax' && (
          <div className="space-y-2">
            {taxEvents.length === 0 && (
              <div className="card text-center py-10 font-mono text-xs text-gray-400">No tax events yet.</div>
            )}
            {taxEvents.map(event => (
              <div key={event.id} className={`card flex items-start gap-4 ${event.completed ? 'opacity-50' : ''}`}>
                <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center mt-0.5 ${event.completed ? 'bg-green-500 border-green-500 text-white text-xs' : 'border-gray-300'}`}>
                  {event.completed && '✓'}
                </div>
                <div className="flex-1">
                  <div className={`font-sans text-sm font-medium ${event.completed ? 'line-through text-gray-400' : 'text-ink'}`}>{event.title}</div>
                  {event.description && <div className="font-mono text-xs text-gray-400 mt-0.5">{event.description}</div>}
                </div>
                <div className="font-mono text-xs text-gray-400 flex-shrink-0">
                  {new Date(event.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

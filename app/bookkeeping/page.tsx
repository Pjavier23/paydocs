'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

const INDUSTRIES = [
  { value: 'contractor', label: '🔨 General Contractor' },
  { value: 'cleaning', label: '🧹 Cleaning' },
  { value: 'construction', label: '🏗️ Construction' },
  { value: 'hvac', label: '❄️ HVAC' },
  { value: 'flooring', label: '🪵 Flooring' },
  { value: 'other', label: '💼 Other' },
]

const STATUS_COLORS: Record<string, string> = {
  trial: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function BookkeepingDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<any[]>([])
  const [error, setError] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const [form, setForm] = useState({
    business_name: '',
    contact_name: '',
    email: '',
    phone: '',
    industry: 'contractor',
    monthly_fee: '100',
  })

  const fetchClients = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }

    const res = await fetch('/api/bookkeeping/clients', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) {
      const err = await res.json()
      setError(err.error || 'Failed to load clients')
      setLoading(false)
      return
    }
    const { clients } = await res.json()
    setClients(clients || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchClients() }, [fetchClients])

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveMsg('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/bookkeeping/clients', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...form, monthly_fee: Number(form.monthly_fee) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveMsg(data.error || 'Failed to create client')
      } else {
        setSaveMsg(data.emailSent ? '✓ Client added & invite sent!' : '✓ Client added (email not sent)')
        setForm({ business_name: '', contact_name: '', email: '', phone: '', industry: 'contractor', monthly_fee: '100' })
        fetchClients()
        setTimeout(() => { setShowAddModal(false); setSaveMsg('') }, 1500)
      }
    } finally {
      setSaving(false)
    }
  }

  const totalMRR = clients
    .filter(c => c.subscription_status === 'active' || c.subscription_status === 'trial')
    .reduce((sum, c) => sum + (c.monthly_fee || 100), 0)

  const totalDocs = clients.reduce((sum, c) => sum + (c.doc_count || 0), 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="font-mono text-xs uppercase tracking-widest text-gray-400">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-6xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[3px] text-gray-400 mb-2">
              Bookkeeping
            </div>
            <h1 className="font-display text-4xl text-ink">Client Dashboard</h1>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary mt-2"
          >
            + Add Client
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="card">
            <div className="font-mono text-[10px] uppercase tracking-[3px] text-gray-400 mb-1">Monthly Revenue</div>
            <div className="font-display text-3xl text-ink">${totalMRR.toLocaleString()}</div>
            <div className="font-mono text-xs text-gray-400 mt-1">{clients.length} client{clients.length !== 1 ? 's' : ''} × $100/mo</div>
          </div>
          <div className="card">
            <div className="font-mono text-[10px] uppercase tracking-[3px] text-gray-400 mb-1">Documents</div>
            <div className="font-display text-3xl text-ink">{totalDocs}</div>
            <div className="font-mono text-xs text-gray-400 mt-1">total uploaded</div>
          </div>
          <div className="card">
            <div className="font-mono text-[10px] uppercase tracking-[3px] text-gray-400 mb-1">Active Clients</div>
            <div className="font-display text-3xl text-ink">
              {clients.filter(c => c.subscription_status === 'active').length}
            </div>
            <div className="font-mono text-xs text-gray-400 mt-1">
              {clients.filter(c => c.subscription_status === 'trial').length} in trial
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4 mb-6 font-mono text-sm text-red-600">
            {error}
            {error.toLowerCase().includes('does not exist') && (
              <div className="mt-2">
                <span className="text-red-500">→ </span>
                <a href="/bookkeeping/setup" className="underline">Run database migrations first</a>
              </div>
            )}
          </div>
        )}

        {/* Client grid */}
        {clients.length === 0 ? (
          <div className="card text-center py-20">
            <div className="text-4xl mb-4">📚</div>
            <div className="font-display text-2xl text-ink mb-2">No clients yet</div>
            <p className="font-mono text-sm text-gray-400 mb-6">Add your first bookkeeping client to get started.</p>
            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              + Add First Client
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <Link
                key={client.id}
                href={`/bookkeeping/${client.id}`}
                className="card hover:border-ink hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-sans font-semibold text-ink group-hover:text-gray-700">
                      {client.business_name}
                    </div>
                    {client.contact_name && (
                      <div className="font-mono text-xs text-gray-400 mt-0.5">{client.contact_name}</div>
                    )}
                  </div>
                  <span className={`font-mono text-[9px] uppercase tracking-wider px-2 py-1 rounded-full ${STATUS_COLORS[client.subscription_status] || 'bg-gray-100 text-gray-500'}`}>
                    {client.subscription_status}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  {client.industry && (
                    <span className="font-mono text-[9px] uppercase tracking-wider text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
                      {INDUSTRIES.find(i => i.value === client.industry)?.label.split(' ').slice(1).join(' ') || client.industry}
                    </span>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                  <div>
                    <div className="font-mono text-[10px] text-gray-400">Docs</div>
                    <div className="font-mono text-sm text-ink font-medium">{client.doc_count || 0}</div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] text-gray-400">Monthly</div>
                    <div className="font-mono text-sm text-ink font-medium">${client.monthly_fee || 100}</div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] text-gray-400">Last upload</div>
                    <div className="font-mono text-sm text-ink font-medium">
                      {client.last_upload
                        ? new Date(client.last_upload).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : '—'}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-gray-200 w-full max-w-md p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl text-ink">New Client</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-ink text-xl">×</button>
            </div>

            <form onSubmit={handleAddClient} className="space-y-4">
              <div>
                <label className="label">Business Name *</label>
                <input
                  className="input-field"
                  value={form.business_name}
                  onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
                  placeholder="Acme Contracting LLC"
                  required
                />
              </div>
              <div>
                <label className="label">Contact Name</label>
                <input
                  className="input-field"
                  value={form.contact_name}
                  onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                  placeholder="John Smith"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Email</label>
                  <input
                    className="input-field"
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="john@acme.com"
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    className="input-field"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="(555) 000-0000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Industry</label>
                  <select
                    className="input-field"
                    value={form.industry}
                    onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                  >
                    {INDUSTRIES.map(i => (
                      <option key={i.value} value={i.value}>{i.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Monthly Fee ($)</label>
                  <input
                    className="input-field"
                    type="number"
                    value={form.monthly_fee}
                    onChange={e => setForm(f => ({ ...f, monthly_fee: e.target.value }))}
                    min="0"
                  />
                </div>
              </div>

              {saveMsg && (
                <div className={`font-mono text-xs p-3 rounded ${saveMsg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {saveMsg}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving…' : 'Add Client & Send Invite'}
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

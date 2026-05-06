import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getUserFromToken } from '@/lib/supabase-admin'
import OpenAI from 'openai'

function getToken(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : null
}

// POST /api/bookkeeping/documents/extract
// Takes a document_id + file_url, runs GPT-4o-mini vision, saves extracted data
export async function POST(req: NextRequest) {
  const token = getToken(req)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { document_id, file_url } = await req.json()
  if (!document_id || !file_url) {
    return NextResponse.json({ error: 'document_id and file_url required' }, { status: 400 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 503 })
  }

  const supabase = createAdminClient()

  // Verify doc exists
  const { data: doc } = await supabase
    .from('bk_documents')
    .select('id, client_id')
    .eq('id', document_id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: file_url, detail: 'low' },
            },
            {
              type: 'text',
              text: `Extract information from this financial document. Return ONLY valid JSON with these fields:
{
  "vendor": "business or person name",
  "amount": 0.00,
  "date": "YYYY-MM-DD or null",
  "is_income": false,
  "category": "one of: materials, labor, equipment, office, travel, meals, utilities, other",
  "description": "brief 1-sentence description",
  "doc_type": "one of: receipt, invoice, bank_statement, other",
  "tax_deductible": true
}
If you can't determine a value, use null. For is_income: true if this is money received (invoice to a customer, payment received), false if it's an expense/purchase.`,
            },
          ],
        },
      ],
      max_tokens: 300,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    let extracted: any = {}
    try {
      extracted = JSON.parse(raw)
    } catch {
      extracted = {}
    }

    // Build AI summary
    const summary = [
      extracted.vendor ? `From: ${extracted.vendor}` : null,
      extracted.amount ? `Amount: $${Number(extracted.amount).toFixed(2)}` : null,
      extracted.date ? `Date: ${extracted.date}` : null,
      extracted.category ? `Category: ${extracted.category}` : null,
    ]
      .filter(Boolean)
      .join(' · ')

    // Save extracted data back to the document
    const { data: updated, error } = await supabase
      .from('bk_documents')
      .update({
        vendor: extracted.vendor || null,
        amount: extracted.amount ? Number(extracted.amount) : null,
        doc_date: extracted.date || null,
        category: extracted.category || 'other',
        description: extracted.description || null,
        is_income: extracted.is_income === true,
        tax_deductible: extracted.tax_deductible !== false,
        doc_type: extracted.doc_type || 'receipt',
        ai_summary: summary,
        ai_processed: true,
      })
      .eq('id', document_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ document: updated, extracted })
  } catch (err: any) {
    // Mark as processed with failure so we don't retry infinitely
    await supabase
      .from('bk_documents')
      .update({ ai_processed: true, ai_summary: 'AI extraction failed' })
      .eq('id', document_id)

    return NextResponse.json({ error: `OpenAI error: ${err.message}` }, { status: 500 })
  }
}

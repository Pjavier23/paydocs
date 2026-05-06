import { NextResponse } from 'next/server'

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

async function runSQL(sql: string) {
  // Use Supabase's PostgREST RPC if available, otherwise try direct insert approach
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  return res
}

export async function GET() {
  // Check if table already exists by trying to select from it
  const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/documents?limit=1`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    }
  })
  
  if (checkRes.ok) {
    return NextResponse.json({ status: 'ok', message: 'Table already exists' })
  }
  
  return NextResponse.json({ 
    status: 'needs_migration',
    instructions: 'Run supabase-schema.sql in Supabase SQL Editor',
    url: `${SUPABASE_URL.replace('.supabase.co', '')}/dashboard/project/default/sql`
  })
}

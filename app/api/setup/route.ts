import { NextResponse } from 'next/server'

export async function GET() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // Insert a test document to verify table exists, if not it'll error
  const testRes = await fetch(`${SUPABASE_URL}/rest/v1/documents?limit=1`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    }
  })

  if (testRes.ok) {
    return NextResponse.json({ status: 'table_exists', message: 'Documents table already exists' })
  }

  return NextResponse.json({ 
    status: 'needs_migration', 
    message: 'Run supabase-schema.sql in Supabase SQL Editor',
    sql_url: 'https://supabase.com/dashboard/project/tkljofxcndnwqyqrtrnx/sql'
  })
}

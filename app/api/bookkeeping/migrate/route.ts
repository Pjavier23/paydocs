import { NextResponse } from 'next/server'

// GET /api/bookkeeping/migrate — returns migration instructions + SQL
export async function GET() {
  const sql = `-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tkljofxcndnwqyqrtrnx/sql

-- See bookkeeping-schema.sql in the repo root for the full migration.`

  return NextResponse.json({
    message: 'Run bookkeeping-schema.sql in your Supabase SQL Editor',
    url: 'https://supabase.com/dashboard/project/tkljofxcndnwqyqrtrnx/sql',
    schema_file: 'bookkeeping-schema.sql',
  })
}

-- ============================================================
-- PayDocs Bookkeeping Module — Run in Supabase SQL Editor
-- https://supabase.com/dashboard/project/tkljofxcndnwqyqrtrnx/sql
-- ============================================================

-- 1. Bookkeeping clients (Pedro's clients)
CREATE TABLE IF NOT EXISTS bk_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  industry text, -- 'contractor', 'cleaning', 'construction', 'hvac', 'flooring', 'other'
  subscription_status text DEFAULT 'trial', -- 'trial', 'active', 'cancelled'
  stripe_customer_id text,
  stripe_subscription_id text,
  monthly_fee numeric DEFAULT 100.00,
  invite_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  invited_at timestamptz DEFAULT now(),
  onboarded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 2. Documents (receipts, invoices, bank statements, etc)
CREATE TABLE IF NOT EXISTS bk_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES bk_clients(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES auth.users(id),
  doc_type text, -- 'receipt', 'invoice', 'bank_statement', 'other'
  file_url text,
  thumbnail_url text,
  -- AI extracted fields
  vendor text,
  amount numeric,
  doc_date date,
  category text, -- 'materials', 'labor', 'equipment', 'office', 'travel', 'meals', 'utilities', 'other'
  description text,
  ai_summary text,
  ai_processed boolean DEFAULT false,
  is_income boolean DEFAULT false,
  tax_deductible boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 3. Tax events and due dates
CREATE TABLE IF NOT EXISTS bk_tax_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES bk_clients(id) ON DELETE CASCADE,
  event_type text, -- 'quarterly_estimated', 'annual_filing', 'w9', '1099_filing'
  due_date date NOT NULL,
  title text NOT NULL,
  description text,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE bk_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE bk_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE bk_tax_events ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Owner manages their own clients
CREATE POLICY "Owner manages own bk_clients"
  ON bk_clients FOR ALL
  USING (auth.uid() = owner_id);

-- Owner manages documents for their clients
CREATE POLICY "Owner manages bk_documents"
  ON bk_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM bk_clients
      WHERE id = bk_documents.client_id
      AND owner_id = auth.uid()
    )
    OR uploaded_by = auth.uid()
  );

-- Owner manages tax events for their clients
CREATE POLICY "Owner manages bk_tax_events"
  ON bk_tax_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM bk_clients
      WHERE id = bk_tax_events.client_id
      AND owner_id = auth.uid()
    )
  );

-- 6. Storage bucket for bookkeeping docs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bookkeeping',
  'bookkeeping',
  false,
  52428800, -- 50MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Storage policy: owner can manage files
CREATE POLICY "Authenticated users can upload bookkeeping files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'bookkeeping' AND auth.uid() IS NOT NULL);

CREATE POLICY "Owner can read bookkeeping files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bookkeeping' AND auth.uid() IS NOT NULL);

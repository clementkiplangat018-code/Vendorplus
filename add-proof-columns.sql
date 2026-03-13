-- ══════════════════════════════════════════════════
-- VendorPlus — Add proof upload columns to transactions
-- Run this in: Supabase → SQL Editor → New query
-- ══════════════════════════════════════════════════

-- 1. Add columns to transactions table
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS proof_url      text,
  ADD COLUMN IF NOT EXISTS agent_notes    text,
  ADD COLUMN IF NOT EXISTS client_ref     text,
  ADD COLUMN IF NOT EXISTS confirmed_at   timestamptz;

-- 2. Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies — agents can upload, everyone can read
CREATE POLICY "agents can upload proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-proofs' AND auth.role() = 'authenticated');

CREATE POLICY "proofs are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs');

CREATE POLICY "agents can update their uploads"
ON storage.objects FOR UPDATE
USING (bucket_id = 'payment-proofs' AND auth.role() = 'authenticated');

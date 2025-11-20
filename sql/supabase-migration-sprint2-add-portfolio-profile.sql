-- Migration: add investor profile fields to portfolios
-- Run this in Supabase SQL editor or via psql with the service role.

ALTER TABLE public.portfolios
  ADD COLUMN IF NOT EXISTS investor_profile public.investor_profile DEFAULT 'equilibre',
  ADD COLUMN IF NOT EXISTS target_equity_pct NUMERIC(5,2) DEFAULT 60.0,
  ADD COLUMN IF NOT EXISTS investment_horizon_years integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS objective text DEFAULT 'croissance';

-- Note: adjust defaults as needed. Ensure the enum public.investor_profile exists.

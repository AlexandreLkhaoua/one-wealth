-- =====================================================
-- ONEWEALTH - EXTENSION SCHEMA POUR ASSETS
-- =====================================================
-- Ce fichier ajoute la table assets et les relations nécessaires
-- pour le Sprint 1 (enrichissement des données marché)
-- À exécuter après supabase-schema.sql
-- =====================================================

-- =====================================================
-- 1. TABLE : assets (données marché enrichies)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.assets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Identifiants
  isin TEXT UNIQUE NOT NULL,
  ticker TEXT,
  name TEXT NOT NULL,
  
  -- Informations de base
  asset_type TEXT, -- 'stock', 'etf', 'bond', 'fund', 'crypto', etc.
  sector TEXT, -- Ex: "Technology", "Financial Services", "Healthcare"
  region TEXT, -- Ex: "Europe", "USA", "Chine"
  currency TEXT DEFAULT 'EUR' NOT NULL,
  
  -- Prix et performances
  last_price DECIMAL(18, 4),
  previous_close DECIMAL(18, 4),
  price_change_pct DECIMAL(8, 4), -- Variation % du jour
  perf_1y DECIMAL(8, 4), -- Performance 1 an en %
  volatility_1y DECIMAL(8, 4), -- Volatilité annualisée en %
  
  -- Metadata
  market_cap BIGINT,
  data_source TEXT DEFAULT 'manual', -- 'manual', 'yahoo', 'fmp', etc.
  last_updated TIMESTAMPTZ, -- Dernière mise à jour des données marché
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 2. INDEX POUR assets
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_assets_isin ON public.assets(isin);
CREATE INDEX IF NOT EXISTS idx_assets_ticker ON public.assets(ticker);
CREATE INDEX IF NOT EXISTS idx_assets_sector ON public.assets(sector);
CREATE INDEX IF NOT EXISTS idx_assets_region ON public.assets(region);
CREATE INDEX IF NOT EXISTS idx_assets_last_updated ON public.assets(last_updated DESC NULLS LAST);

-- =====================================================
-- 3. TRIGGER updated_at POUR assets
-- =====================================================

CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. AJOUTER asset_id À positions
-- =====================================================

-- Ajouter la colonne asset_id si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'positions' 
    AND column_name = 'asset_id'
  ) THEN
    ALTER TABLE public.positions
    ADD COLUMN asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index pour améliorer les performances des jointures
CREATE INDEX IF NOT EXISTS idx_positions_asset_id ON public.positions(asset_id);

-- =====================================================
-- 5. ROW LEVEL SECURITY POUR assets
-- =====================================================

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Policy : Lecture pour tous les utilisateurs authentifiés
CREATE POLICY "Authenticated users can view assets"
  ON public.assets
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy : Insertion/Update pour le service_role (backend uniquement)
-- Les utilisateurs normaux ne peuvent PAS modifier directement les assets
-- Seul le backend (service_role) peut insérer/mettre à jour

-- Note: Les policies pour INSERT/UPDATE ne sont pas nécessaires car 
-- seul le backend avec service_role_key pourra modifier cette table

-- =====================================================
-- 6. VUE : positions avec données enrichies
-- =====================================================

-- Vue pour faciliter les requêtes frontend : positions + assets
CREATE OR REPLACE VIEW positions_enriched AS
SELECT
  pos.id,
  pos.portfolio_id,
  pos.date,
  pos.provider,
  pos.asset_class,
  pos.instrument_name,
  pos.isin,
  pos.region,
  pos.currency,
  pos.quantity,
  pos.purchase_price,
  pos.current_value,
  pos.notes,
  pos.created_at,
  pos.updated_at,
  -- Données enrichies depuis assets
  ass.id AS asset_id,
  ass.ticker AS asset_ticker,
  ass.name AS asset_name,
  ass.asset_type AS asset_type,
  ass.sector AS asset_sector,
  ass.region AS asset_region,
  ass.last_price AS asset_last_price,
  ass.previous_close AS asset_previous_close,
  ass.price_change_pct AS asset_price_change_pct,
  ass.perf_1y AS asset_perf_1y,
  ass.volatility_1y AS asset_volatility_1y,
  ass.market_cap AS asset_market_cap,
  ass.data_source AS asset_data_source,
  ass.last_updated AS asset_last_updated
FROM public.positions pos
LEFT JOIN public.assets ass ON ass.id = pos.asset_id;

-- =====================================================
-- 7. FONCTION : Obtenir les assets obsolètes
-- =====================================================

-- Fonction pour identifier les assets dont les données sont obsolètes (> 24h)
CREATE OR REPLACE FUNCTION get_stale_assets(max_age_hours INTEGER DEFAULT 24)
RETURNS TABLE (
  id UUID,
  isin TEXT,
  ticker TEXT,
  name TEXT,
  last_updated TIMESTAMPTZ,
  hours_since_update NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.isin,
    a.ticker,
    a.name,
    a.last_updated,
    EXTRACT(EPOCH FROM (NOW() - a.last_updated)) / 3600 AS hours_since_update
  FROM public.assets a
  WHERE
    a.last_updated IS NULL
    OR a.last_updated < (NOW() - (max_age_hours || ' hours')::INTERVAL)
  ORDER BY a.last_updated ASC NULLS FIRST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. FONCTION : Obtenir les assets d'un portefeuille
-- =====================================================

CREATE OR REPLACE FUNCTION get_portfolio_assets(p_portfolio_id UUID)
RETURNS TABLE (
  asset_id UUID,
  isin TEXT,
  ticker TEXT,
  name TEXT,
  positions_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS asset_id,
    a.isin,
    a.ticker,
    a.name,
    COUNT(pos.id) AS positions_count
  FROM public.positions pos
  JOIN public.assets a ON a.id = pos.asset_id
  WHERE pos.portfolio_id = p_portfolio_id
  GROUP BY a.id, a.isin, a.ticker, a.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. VÉRIFICATION
-- =====================================================

-- Vérifier que la table assets existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'assets'
  ) THEN
    RAISE NOTICE 'Table assets créée avec succès';
  ELSE
    RAISE EXCEPTION 'Erreur : table assets non créée';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'positions' 
    AND column_name = 'asset_id'
  ) THEN
    RAISE NOTICE 'Colonne positions.asset_id ajoutée avec succès';
  ELSE
    RAISE EXCEPTION 'Erreur : colonne asset_id non ajoutée';
  END IF;
END $$;

SELECT 'Schema assets créé avec succès!' AS status;

-- =====================================================
-- FIN DU SCHEMA ASSETS
-- =====================================================

-- =====================================================
-- ONEWEALTH - MIGRATION SPRINT 1
-- =====================================================
-- Ce fichier complète la structure existante pour le Sprint 1
-- N'exécuter QUE ce qui n'existe pas déjà dans Supabase
-- =====================================================

-- =====================================================
-- 1. VÉRIFIER ET CRÉER LES ENUMS MANQUANTS
-- =====================================================

-- Créer asset_class_type SEULEMENT s'il n'existe pas
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_class_type') THEN
        CREATE TYPE asset_class_type AS ENUM ('action', 'obligation', 'etf', 'fond_euro', 'cash', 'immobilier', 'crypto', 'autre');
    END IF;
END $$;

-- Créer region_type SEULEMENT s'il n'existe pas
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'region_type') THEN
        CREATE TYPE region_type AS ENUM ('europe', 'usa', 'chine', 'pays_emergents', 'asie_pacifique', 'autres');
    END IF;
END $$;

-- =====================================================
-- 2. AJOUTER LA COLONNE asset_id DANS positions
-- =====================================================

-- Vérifier si la colonne asset_id existe déjà
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'positions' 
        AND column_name = 'asset_id'
    ) THEN
        ALTER TABLE public.positions ADD COLUMN asset_id UUID;
    END IF;
END $$;

-- =====================================================
-- 3. CRÉER LA TABLE assets (données enrichies)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.assets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Identifiants
  isin TEXT UNIQUE NOT NULL,
  ticker TEXT,
  name TEXT NOT NULL,
  
  -- Informations de base
  asset_type TEXT,
  sector TEXT,
  region TEXT,
  currency TEXT DEFAULT 'EUR' NOT NULL,
  
  -- Prix et performances
  last_price DECIMAL(18, 4),
  previous_close DECIMAL(18, 4),
  price_change_pct DECIMAL(8, 4),
  perf_1y DECIMAL(8, 4),
  volatility_1y DECIMAL(8, 4),
  
  -- Metadata
  market_cap BIGINT,
  data_source TEXT DEFAULT 'manual',
  last_updated TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 4. INDEX POUR assets
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_assets_isin ON public.assets(isin);
CREATE INDEX IF NOT EXISTS idx_assets_ticker ON public.assets(ticker);
CREATE INDEX IF NOT EXISTS idx_assets_sector ON public.assets(sector);
CREATE INDEX IF NOT EXISTS idx_assets_region ON public.assets(region);
CREATE INDEX IF NOT EXISTS idx_assets_last_updated ON public.assets(last_updated);

-- =====================================================
-- 5. AJOUTER LA FOREIGN KEY positions -> assets
-- =====================================================

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'positions_asset_id_fkey'
    ) THEN
        ALTER TABLE public.positions 
        ADD CONSTRAINT positions_asset_id_fkey 
        FOREIGN KEY (asset_id) REFERENCES public.assets(id);
    END IF;
END $$;

-- =====================================================
-- 6. INDEX POUR positions.asset_id
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_positions_asset_id ON public.positions(asset_id);

-- =====================================================
-- 7. VUE : positions_enriched (jointure positions + assets)
-- =====================================================

CREATE OR REPLACE VIEW public.positions_enriched AS
SELECT 
  p.*,
  a.ticker,
  a.name AS asset_name,
  a.asset_type,
  a.sector,
  a.region AS asset_region,
  a.last_price,
  a.previous_close,
  a.price_change_pct,
  a.perf_1y,
  a.volatility_1y,
  a.market_cap,
  a.data_source,
  a.last_updated AS market_data_updated_at
FROM public.positions p
LEFT JOIN public.assets a ON p.asset_id = a.id;

-- =====================================================
-- 8. FONCTION : Trigger pour updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. TRIGGERS pour updated_at
-- =====================================================

-- Trigger pour assets
DROP TRIGGER IF EXISTS trigger_assets_updated_at ON public.assets;
CREATE TRIGGER trigger_assets_updated_at
BEFORE UPDATE ON public.assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Vérifier si le trigger existe déjà pour positions
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_positions_updated_at'
    ) THEN
        CREATE TRIGGER trigger_positions_updated_at
        BEFORE UPDATE ON public.positions
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- =====================================================
-- 10. FONCTION UTILITAIRE : Rechercher un asset par ISIN
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_asset_by_isin(p_isin TEXT)
RETURNS TABLE (
  id UUID,
  isin TEXT,
  ticker TEXT,
  name TEXT,
  sector TEXT,
  last_price DECIMAL,
  perf_1y DECIMAL,
  volatility_1y DECIMAL,
  last_updated TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.isin,
    a.ticker,
    a.name,
    a.sector,
    a.last_price,
    a.perf_1y,
    a.volatility_1y,
    a.last_updated
  FROM public.assets a
  WHERE a.isin = p_isin;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS sur assets
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Policy : Les utilisateurs authentifiés peuvent lire les assets
CREATE POLICY "assets_select_policy" ON public.assets
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy : Seuls les admins peuvent modifier les assets
CREATE POLICY "assets_insert_policy" ON public.assets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'advisor')
    )
  );

CREATE POLICY "assets_update_policy" ON public.assets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'advisor')
    )
  );

-- =====================================================
-- 12. GRANT PERMISSIONS
-- =====================================================

-- Permissions pour authenticated users
GRANT SELECT ON public.assets TO authenticated;
GRANT SELECT ON public.positions_enriched TO authenticated;
GRANT INSERT, UPDATE ON public.assets TO authenticated;

-- Permissions pour service_role (backend API)
GRANT ALL ON public.assets TO service_role;
GRANT ALL ON public.positions TO service_role;
GRANT ALL ON public.positions_enriched TO service_role;

-- =====================================================
-- ✅ MIGRATION SPRINT 1 TERMINÉE
-- =====================================================

-- Pour vérifier que tout s'est bien passé :
-- SELECT * FROM public.assets LIMIT 1;
-- SELECT * FROM public.positions_enriched LIMIT 1;

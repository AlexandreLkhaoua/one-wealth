-- =====================================================
-- ONEWEALTH - SUPABASE DATABASE SCHEMA
-- =====================================================
-- Ce fichier contient toute l'architecture de base de données pour OneWealth
-- À exécuter dans l'éditeur SQL de Supabase
-- =====================================================

-- =====================================================
-- 1. ACTIVATION DES EXTENSIONS
-- =====================================================

-- Extension pour les UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extension pour Row Level Security
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 2. TYPES ÉNUMÉRÉS (ENUMS)
-- =====================================================

-- Type de rôle utilisateur
CREATE TYPE user_role AS ENUM ('admin', 'advisor', 'member');

-- Type de profil investisseur
CREATE TYPE investor_profile AS ENUM ('prudent', 'equilibre', 'dynamique', 'offensif');

-- Classe d'actif
CREATE TYPE asset_class_type AS ENUM ('action', 'obligation', 'etf', 'fond_euro', 'cash', 'immobilier', 'crypto', 'autre');

-- Région géographique
CREATE TYPE region_type AS ENUM ('europe', 'usa', 'chine', 'pays_emergents', 'asie_pacifique', 'autres');

-- =====================================================
-- 3. TABLE : users (extension de auth.users)
-- =====================================================

-- Table de profil utilisateur (CIF, CGP, Banquiers)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role DEFAULT 'member' NOT NULL,
  company_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index pour améliorer les performances
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);

-- =====================================================
-- 4. TABLE : clients
-- =====================================================

-- Table des clients gérés par les utilisateurs
CREATE TABLE public.clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  investor_profile investor_profile DEFAULT 'equilibre',
  risk_tolerance INTEGER CHECK (risk_tolerance BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index pour les recherches
CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_clients_email ON public.clients(email);
CREATE INDEX idx_clients_full_name ON public.clients(last_name, first_name);

-- =====================================================
-- 5. TABLE : portfolios
-- =====================================================

-- Table des portefeuilles (un client peut avoir plusieurs portefeuilles)
CREATE TABLE public.portfolios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Portfolio principal',
  description TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index
CREATE INDEX idx_portfolios_client_id ON public.portfolios(client_id);
CREATE INDEX idx_portfolios_active ON public.portfolios(is_active);

-- =====================================================
-- 6. TABLE : positions
-- =====================================================

-- Table des positions (lignes de portefeuille)
CREATE TABLE public.positions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  provider TEXT NOT NULL, -- Nom de la banque/courtier
  asset_class asset_class_type NOT NULL,
  instrument_name TEXT NOT NULL,
  isin TEXT,
  region region_type NOT NULL,
  currency TEXT DEFAULT 'EUR' NOT NULL,
  quantity DECIMAL(18, 6),
  purchase_price DECIMAL(18, 2),
  current_value DECIMAL(18, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index pour les performances
CREATE INDEX idx_positions_portfolio_id ON public.positions(portfolio_id);
CREATE INDEX idx_positions_date ON public.positions(date DESC);
CREATE INDEX idx_positions_isin ON public.positions(isin);
CREATE INDEX idx_positions_asset_class ON public.positions(asset_class);
CREATE INDEX idx_positions_region ON public.positions(region);

-- =====================================================
-- 7. TABLE : portfolio_snapshots
-- =====================================================

-- Table pour stocker des snapshots historiques de la valeur des portefeuilles
CREATE TABLE public.portfolio_snapshots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE NOT NULL,
  snapshot_date DATE NOT NULL,
  total_value DECIMAL(18, 2) NOT NULL,
  positions_count INTEGER NOT NULL,
  metadata JSONB, -- Stockage flexible pour d'autres métriques
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index
CREATE INDEX idx_snapshots_portfolio_date ON public.portfolio_snapshots(portfolio_id, snapshot_date DESC);

-- Contrainte unique : un snapshot par portefeuille par jour
CREATE UNIQUE INDEX idx_unique_snapshot_per_day ON public.portfolio_snapshots(portfolio_id, snapshot_date);

-- =====================================================
-- 8. TABLE : csv_imports
-- =====================================================

-- Table pour tracer les imports CSV
CREATE TABLE public.csv_imports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  rows_imported INTEGER NOT NULL,
  rows_failed INTEGER DEFAULT 0,
  import_status TEXT DEFAULT 'success' NOT NULL,
  error_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index
CREATE INDEX idx_csv_imports_portfolio_id ON public.csv_imports(portfolio_id);
CREATE INDEX idx_csv_imports_user_id ON public.csv_imports(user_id);
CREATE INDEX idx_csv_imports_date ON public.csv_imports(created_at DESC);

-- =====================================================
-- 9. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. TRIGGERS POUR updated_at
-- =====================================================

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csv_imports ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 12. POLICIES RLS - USERS
-- =====================================================

-- Les utilisateurs peuvent voir leur propre profil
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Les utilisateurs peuvent mettre à jour leur propre profil
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Les admins peuvent tout voir
CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 13. POLICIES RLS - CLIENTS
-- =====================================================

-- Les utilisateurs peuvent voir leurs propres clients
CREATE POLICY "Users can view own clients"
  ON public.clients
  FOR SELECT
  USING (user_id = auth.uid());

-- Les utilisateurs peuvent créer des clients
CREATE POLICY "Users can create clients"
  ON public.clients
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Les utilisateurs peuvent modifier leurs clients
CREATE POLICY "Users can update own clients"
  ON public.clients
  FOR UPDATE
  USING (user_id = auth.uid());

-- Les utilisateurs peuvent supprimer leurs clients
CREATE POLICY "Users can delete own clients"
  ON public.clients
  FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- 14. POLICIES RLS - PORTFOLIOS
-- =====================================================

-- Les utilisateurs peuvent voir les portfolios de leurs clients
CREATE POLICY "Users can view own portfolios"
  ON public.portfolios
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = portfolios.client_id
      AND clients.user_id = auth.uid()
    )
  );

-- Les utilisateurs peuvent créer des portfolios pour leurs clients
CREATE POLICY "Users can create portfolios"
  ON public.portfolios
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = client_id
      AND clients.user_id = auth.uid()
    )
  );

-- Les utilisateurs peuvent modifier leurs portfolios
CREATE POLICY "Users can update own portfolios"
  ON public.portfolios
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = portfolios.client_id
      AND clients.user_id = auth.uid()
    )
  );

-- Les utilisateurs peuvent supprimer leurs portfolios
CREATE POLICY "Users can delete own portfolios"
  ON public.portfolios
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = portfolios.client_id
      AND clients.user_id = auth.uid()
    )
  );

-- =====================================================
-- 15. POLICIES RLS - POSITIONS
-- =====================================================

-- Les utilisateurs peuvent voir les positions de leurs portfolios
CREATE POLICY "Users can view own positions"
  ON public.positions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      JOIN public.clients ON clients.id = portfolios.client_id
      WHERE portfolios.id = positions.portfolio_id
      AND clients.user_id = auth.uid()
    )
  );

-- Les utilisateurs peuvent créer des positions
CREATE POLICY "Users can create positions"
  ON public.positions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portfolios
      JOIN public.clients ON clients.id = portfolios.client_id
      WHERE portfolios.id = portfolio_id
      AND clients.user_id = auth.uid()
    )
  );

-- Les utilisateurs peuvent modifier leurs positions
CREATE POLICY "Users can update own positions"
  ON public.positions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      JOIN public.clients ON clients.id = portfolios.client_id
      WHERE portfolios.id = positions.portfolio_id
      AND clients.user_id = auth.uid()
    )
  );

-- Les utilisateurs peuvent supprimer leurs positions
CREATE POLICY "Users can delete own positions"
  ON public.positions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      JOIN public.clients ON clients.id = portfolios.client_id
      WHERE portfolios.id = positions.portfolio_id
      AND clients.user_id = auth.uid()
    )
  );

-- =====================================================
-- 16. POLICIES RLS - SNAPSHOTS
-- =====================================================

CREATE POLICY "Users can view own snapshots"
  ON public.portfolio_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      JOIN public.clients ON clients.id = portfolios.client_id
      WHERE portfolios.id = portfolio_snapshots.portfolio_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create snapshots"
  ON public.portfolio_snapshots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portfolios
      JOIN public.clients ON clients.id = portfolios.client_id
      WHERE portfolios.id = portfolio_id
      AND clients.user_id = auth.uid()
    )
  );

-- =====================================================
-- 17. POLICIES RLS - CSV IMPORTS
-- =====================================================

CREATE POLICY "Users can view own imports"
  ON public.csv_imports
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create imports"
  ON public.csv_imports
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 18. VUES UTILES
-- =====================================================

-- Vue : Résumé des portefeuilles avec valeur totale
CREATE OR REPLACE VIEW portfolio_summary AS
SELECT
  p.id AS portfolio_id,
  p.name AS portfolio_name,
  p.client_id,
  c.first_name || ' ' || c.last_name AS client_name,
  c.user_id,
  COUNT(pos.id) AS positions_count,
  COALESCE(SUM(pos.current_value), 0) AS total_value,
  MAX(pos.updated_at) AS last_updated
FROM public.portfolios p
JOIN public.clients c ON c.id = p.client_id
LEFT JOIN public.positions pos ON pos.portfolio_id = p.id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.client_id, c.first_name, c.last_name, c.user_id;

-- Vue : Répartition par classe d'actif
CREATE OR REPLACE VIEW portfolio_asset_allocation AS
SELECT
  pos.portfolio_id,
  pos.asset_class,
  COUNT(*) AS positions_count,
  SUM(pos.current_value) AS total_value,
  ROUND((SUM(pos.current_value) / NULLIF(
    (SELECT SUM(current_value) FROM public.positions WHERE portfolio_id = pos.portfolio_id), 0
  ) * 100)::numeric, 2) AS percentage
FROM public.positions pos
GROUP BY pos.portfolio_id, pos.asset_class;

-- Vue : Répartition géographique
CREATE OR REPLACE VIEW portfolio_geographic_allocation AS
SELECT
  pos.portfolio_id,
  pos.region,
  COUNT(*) AS positions_count,
  SUM(pos.current_value) AS total_value,
  ROUND((SUM(pos.current_value) / NULLIF(
    (SELECT SUM(current_value) FROM public.positions WHERE portfolio_id = pos.portfolio_id), 0
  ) * 100)::numeric, 2) AS percentage
FROM public.positions pos
GROUP BY pos.portfolio_id, pos.region;

-- =====================================================
-- 19. FONCTION : Créer un snapshot automatique
-- =====================================================

CREATE OR REPLACE FUNCTION create_portfolio_snapshot(p_portfolio_id UUID)
RETURNS UUID AS $$
DECLARE
  v_snapshot_id UUID;
  v_total_value DECIMAL(18, 2);
  v_positions_count INTEGER;
BEGIN
  -- Calculer la valeur totale et le nombre de positions
  SELECT
    COALESCE(SUM(current_value), 0),
    COUNT(*)
  INTO v_total_value, v_positions_count
  FROM public.positions
  WHERE portfolio_id = p_portfolio_id;

  -- Insérer le snapshot (ou le mettre à jour si existe déjà pour aujourd'hui)
  INSERT INTO public.portfolio_snapshots (portfolio_id, snapshot_date, total_value, positions_count)
  VALUES (p_portfolio_id, CURRENT_DATE, v_total_value, v_positions_count)
  ON CONFLICT (portfolio_id, snapshot_date)
  DO UPDATE SET
    total_value = v_total_value,
    positions_count = v_positions_count,
    created_at = NOW()
  RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 20. DONNÉES DE TEST (OPTIONNEL - À COMMENTER EN PROD)
-- =====================================================

-- Décommenter les lignes ci-dessous pour créer des données de test

/*
-- Insérer un utilisateur de test (nécessite un user auth créé)
INSERT INTO public.users (id, email, full_name, role, company_name)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'test@onewealth.com', 'Jean Dupont', 'advisor', 'OneWealth Conseil');

-- Insérer un client de test
INSERT INTO public.clients (id, user_id, first_name, last_name, email, investor_profile, risk_tolerance)
VALUES
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Marie', 'Martin', 'marie.martin@example.com', 'dynamique', 7);

-- Insérer un portefeuille de test
INSERT INTO public.portfolios (id, client_id, name, description)
VALUES
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Portfolio Principal', 'Portfolio diversifié');
*/

-- =====================================================
-- FIN DU SCHEMA
-- =====================================================

-- Pour vérifier que tout est bien créé :
SELECT 'Schema created successfully!' AS status;

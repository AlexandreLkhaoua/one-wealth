# 💼 OneWealth - Plateforme de Gestion de Portefeuilles

**Statut:** ✅ Production-Ready (Sprint 1 + Sprint 2 terminés)  
**Branch:** `sprint2/score-profile-alerts`  
**Stack:** Next.js 16 + FastAPI + Supabase

---

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 18+ et npm
- Python 3.11+
- Compte Supabase (base de données PostgreSQL)

### Installation

```bash
# 1. Frontend
npm install

# 2. Backend
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 3. Configuration environnement
cp backend/.env.example backend/.env
# Éditer backend/.env avec vos credentials Supabase

# 4. Base de données
# Exécuter dans Supabase SQL Editor:
# - sql/supabase-schema.sql
# - sql/supabase-schema-assets.sql  
# - sql/supabase-migration-sprint1.sql
# - sql/supabase-migration-sprint2-add-portfolio-profile.sql
```

### Lancement

```bash
# Terminal 1 - Backend
cd backend
source .venv/bin/activate
./start.sh  # ou: uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend  
npm run dev
```

Accéder à: **http://localhost:3000**

Pour plus de détails, voir [`QUICKSTART.md`](QUICKSTART.md)

---

## 📋 Fonctionnalités

### ✅ Sprint 1 - Import & Enrichissement

**Import de portefeuille via CSV**
- Upload de fichiers CSV avec positions (ISIN, valeurs, asset class, régions)
- Parsing et validation automatique
- Création/association des assets dans la base de données

**Enrichissement des données**
- Récupération automatique via yfinance (secteur, prix, performance 1Y, volatilité)
- Mise à jour régulière des données de marché
- Vue enrichie `positions_enriched` pour jointure position ↔ asset

**Dashboard complet**
- 📊 Vue d'ensemble: graphiques temporels et répartitions
- 📈 Performance: Sharpe Ratio, Alpha/Beta, VaR, Drawdown
- 🎯 Allocation: Index HHI, Top 5, Secteurs, Régions
- 📋 Holdings: Table interactive avec recherche & tri

**Métriques affichées:**
- Valeur totale, performance moyenne
- Diversification par asset class, région, secteur
- Concentration (Top 5 positions)
- Volatilité et ratios de risque

### ✅ Sprint 2 - Score & Profil Investisseur

**Profil investisseur**
- 4 profils: Prudent (20% actions), Équilibré (60%), Dynamique (80%), Agressif (90%)
- Configuration: % actions cible, horizon de placement, objectif
- UI avec sélecteur de profil + slider target equity

**Score de portefeuille (0-100)**
- **Global Score**: moyenne pondérée de 4 sous-scores
- **4 Sous-scores:**
  1. **Diversification** (HHI + nombre de secteurs)
  2. **Adéquation au profil** (écart actions réel vs cible)
  3. **Exposition macro** (USD, Tech, Obligations)
  4. **Qualité des supports** (performance + volatilité)

**Système d'alertes intelligent**
- 9 types d'alertes: concentration, diversification, mismatch profil, exposition USD/Tech, volatilité, qualité
- Sévérité: 🔴 Rouge (critique), 🟠 Orange (attention), 🟢 Vert (OK)
- Recommandations personnalisées pour chaque alerte

**UI Score & Alertes:**
- Gauge Recharts pour le score global
- 4 sous-scores avec descriptions
- Liste d'alertes avec badges colorés et recommandations

---

## 🏗️ Architecture Technique

### Frontend (Next.js 16)
```
app/
├── page.tsx                    # Landing page
├── login/page.tsx              # Authentification
├── signup/page.tsx             # Inscription
├── dashboard/
│   ├── page.tsx                # Liste des clients
│   └── client/[id]/page.tsx    # Dashboard client (Sprint 1 + Sprint 2)

components/
├── analysis/                   # Sprint 1: 3 modules d'analyse
│   ├── performance-analysis.tsx
│   ├── allocation-analysis.tsx
│   └── holdings-analysis.tsx
├── portfolio-investor-profile.tsx   # Sprint 2: Profil investisseur
├── portfolio-score.tsx              # Sprint 2: Score gauge
├── portfolio-alerts.tsx             # Sprint 2: Alertes
├── portfolio-charts.tsx             # Sprint 1: Graphiques
├── portfolio-table.tsx              # Sprint 1: Table positions
└── ui/                              # Composants design system

lib/
├── api/client.ts               # Client API typé (FastAPI)
├── types/portfolio.ts          # Types TypeScript
└── supabase/                   # Clients Supabase (client/server)
```

**Technologies:**
- Next.js 16 (App Router), TypeScript 5
- Tailwind CSS 4, shadcn/ui (Radix UI)
- Recharts (gauges, graphiques), @nivo (visualisations avancées)
- React Query, Framer Motion
- Supabase JS (auth + database client)

### Backend (FastAPI)
```
backend/
├── main.py                     # App FastAPI + routes principales
├── config.py                   # Configuration (Pydantic Settings)
├── routers/
│   └── portfolios.py           # Endpoints API (import, positions, profile, score)
├── services/
│   ├── enrichment.py           # Enrichissement yfinance
│   ├── profile.py              # Sprint 2: CRUD profil investisseur
│   └── scoring.py              # Sprint 2: Calcul score & alertes
├── schemas/
│   ├── portfolio.py            # Modèles positions, import CSV
│   ├── asset.py                # Modèles assets
│   ├── profile.py              # Sprint 2: Modèles profil
│   └── score.py                # Sprint 2: Modèles score & alertes
├── utils/
│   └── supabase_client.py      # Client Supabase Python (service_role)
└── tests/                      # Tests pytest (7 tests)
    ├── test_scoring.py
    ├── test_scoring_edgecases.py
    └── test_score_endpoint_integration.py
```

**Technologies:**
- FastAPI 0.109.0, Pydantic v2 (2.5.3)
- Python 3.11+, supabase-py ≥2.7
- yfinance 0.2.35 (données de marché)
- pytest 8.4.2

### Base de Données (Supabase PostgreSQL)

**Tables principales:**
- `clients`: Informations clients + user_id (Supabase Auth)
- `portfolios`: Portefeuilles liés aux clients + colonnes Sprint 2 (investor_profile, target_equity_pct, investment_horizon_years, objective)
- `positions`: Positions dans les portefeuilles (valeur, asset_class, région, etc.)
- `assets`: Données enrichies des actifs (ISIN, ticker, secteur, prix, perf, volatilité)
- `csv_imports`: Log des imports CSV

**Vues:**
- `positions_enriched`: Jointure positions ↔ assets pour requêtes optimisées

**Enums:**
- `asset_class_type`: action, obligation, etf, cash, fond_euro
- `region_type`: europe, usa, asie, pays_emergents, autres
- `investor_profile`: prudent, equilibre, dynamique, agressif
- `user_role`: advisor, client, admin

---

## 🔐 Authentification & Sécurité

### Flux d'authentification
1. **Frontend:** Supabase Auth (signup/login) → génère JWT access_token
2. **API Backend:** Extraction Bearer token → Vérification via `supabase.auth.get_user(token)`
3. **Ownership check:** Résolution user_id depuis token → Comparaison avec portfolio.client.user_id

### Codes HTTP
- `200 OK`: Succès
- `401 Unauthorized`: Token manquant ou invalide
- `403 Forbidden`: User non propriétaire du portfolio
- `404 Not Found`: Ressource introuvable
- `500 Internal Server Error`: Erreur serveur

### Variables d'environnement (backend)
```bash
# backend/.env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Secret! Backend only
ENVIRONMENT=development
DEBUG=true
API_HOST=0.0.0.0
API_PORT=8000
```

---

## 🧪 Tests & Quality Assurance

### Tests Backend (7/7 passing ✅)
```bash
cd backend
PYTHONPATH=backend python -m pytest tests -v
```

**Couverture:**
- ✅ Calcul du score (happy path)
- ✅ Détection haute concentration
- ✅ Portfolio vide (score 0)
- ✅ Portfolio 100% cash (pénalité risk profile)
- ✅ Actifs très volatils (pénalité qualité)
- ✅ Endpoint /score avec JWT ownership (200)
- ✅ Endpoint /score forbidden (403)

### Tests Frontend (TypeScript)
```bash
npx tsc --noEmit  # ✅ 0 errors
npx eslint .      # ⚠️ Warnings pré-existants (hors Sprint 1/2)
```

---

## 📡 API Backend

**Base URL:** `http://localhost:8000`

### Endpoints Sprint 1

**POST /api/portfolios/{portfolio_id}/import**
- Upload CSV avec positions
- Retour: CSVImportResult (rows_imported, rows_failed, errors, enrichment)

**GET /api/portfolios/{portfolio_id}/positions**
- Liste des positions enrichies (join avec assets)
- Retour: List[PositionEnriched]

**POST /api/portfolios/{portfolio_id}/enrich**
- Trigger manuel enrichissement yfinance
- Retour: EnrichPortfolioResult (assets_enriched, assets_failed)

### Endpoints Sprint 2

**GET /api/portfolios/{portfolio_id}/profile**
- Récupérer le profil investisseur
- Auth: Bearer token (optionnel, ownership check si fourni)
- Retour: InvestorProfileResponse

**PATCH /api/portfolios/{portfolio_id}/profile**
- Mettre à jour le profil investisseur
- Auth: Bearer token (requis)
- Body: InvestorProfileUpdate (tous champs optionnels)
- Retour: InvestorProfileResponse

**GET /api/portfolios/{portfolio_id}/score**
- Calculer le score et les alertes
- Auth: Bearer token (optionnel, ownership check si fourni)
- Retour: PortfolioScoreResult

---

## 🎨 Design System

**Palette de couleurs:**
- Navy: `#0A0E1A` (background)
- Royal Blue: `#3B82F6` (accents)
- Glassmorphism: `bg-white/5 backdrop-blur-xl`

**Composants UI:**
- Cards premium avec borders gradient
- Badges colorés par sévérité
- Metric cards avec animations CountUp
- Tabs premium avec glow effects
- Tables interactives avec recherche/tri

**Animations:**
- Framer Motion pour transitions de pages
- react-countup pour nombres animés
- Hover effects sur cards/buttons

---

## 📊 Business Logic - Scoring

### Profil → Target Equity
```
prudent    → 20% actions
equilibre  → 60% actions
dynamique  → 80% actions
agressif   → 90% actions
```

### Sous-score Diversification (0-100)
- **HHI (Herfindahl Index)** = Σ(weight²)
  - HHI < 0.10 → 100 points (excellent)
  - HHI > 0.30 → 0-30 points (très concentré)
- **Pénalité secteurs:** < 3 secteurs → -20 points

### Sous-score Risk Profile (0-100)
- **Delta** = |actual_equity_pct - target_equity_pct|
  - Delta ≤ 5% → 100 points (parfait)
  - Delta ≤ 10% → 80 points
  - Delta > 20% → 20 points ou moins

### Sous-score Macro Exposure (0-100)
- **USD:** > 80% → pénalité critique, > 70% → pénalité modérée
- **Tech:** > 50% → pénalité critique, > 40% → pénalité modérée
- **Obligations:** Analysé pour profil prudent

### Sous-score Asset Quality (0-100)
- **Formule:** 0.6 × perf_1y_normalized + 0.4 × (100 - volatility_normalized)
- Pondération par valeur de position
- Pénalise performances négatives + forte volatilité

### Alertes (9 types)
1. HIGH_CONCENTRATION: Top 5 > 60% (red), > 50% (orange)
2. LOW_DIVERSIFICATION: HHI > 0.30 (red), > 0.20 (orange)
3. LOW_SECTOR_DIVERSIFICATION: < 2 secteurs (red), < 3 (orange)
4. RISK_PROFILE_MISMATCH: Delta > 20% (red), > 15% (orange)
5. HIGH_USD_EXPOSURE: USD > 80% (red), > 70% (orange)
6. HIGH_TECH_EXPOSURE: Tech > 50% (red), > 40% (orange)
7. HIGH_VOLATILITY: Vol > 30% (red), > 25% (orange)
8. LOW_QUALITY_ASSETS: Quality < 30 (red), < 50% (orange)
9. OK_PROFILE: Tous les checks passent (green)

---

## 🚀 Déploiement

### Frontend (Vercel recommandé)
```bash
npm run build
# Déployer dist/ sur Vercel, Netlify, ou autre
```

**Variables d'environnement:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` (backend URL en production)

### Backend (Render, Railway, ou VPS)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port $PORT
```

**Variables d'environnement:**
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENVIRONMENT=production`
- `DEBUG=false`

### Base de données (Supabase)
1. Créer projet Supabase
2. Exécuter les 4 fichiers SQL dans l'ordre
3. Configurer RLS policies (production)
4. Récupérer les credentials (URL, anon key, service_role key)

---

## 📝 Prochaines Étapes (Sprint 3+)

- [ ] **Recommandations personnalisées:** Suggérer actions pour améliorer le score
- [ ] **Rééquilibrage automatique:** Proposer ajustements pour aligner sur profil
- [ ] **Historique des scores:** Tracker l'évolution du score dans le temps
- [ ] **Multi-portefeuilles:** Gérer plusieurs portefeuilles par client
- [ ] **Export PDF:** Rapports PDF professionnels
- [ ] **Alertes email:** Notifications automatiques sur alertes critiques
- [ ] **Backtesting:** Simuler performances historiques
- [ ] **RLS policies:** Remplacer service_role par auth user-based + RLS

---

## 🐛 Troubleshooting

### Backend ne démarre pas
- Vérifier `.env` avec vraies credentials Supabase
- Tester config: `python backend/check_config.py`
- Vérifier Python 3.11+: `python --version`

### Positions non enrichies
- Vérifier yfinance: `pip install yfinance --upgrade`
- Tester manuellement: `python backend/enrich_assets.py`
- Logs backend: `PYTHONPATH=backend python -m pytest backend/tests -v`

### Score non affiché
- Vérifier endpoint /score dans DevTools Network
- Vérifier JWT token valide (non expiré)
- Vérifier ownership (user_id match avec portfolio.client.user_id)

### TypeScript errors
```bash
npx tsc --noEmit  # Compiler sans écrire les fichiers
```

### Tests échouent
```bash
cd backend
PYTHONPATH=backend python -m pytest tests -v --tb=short
```

---

## 📄 License

Projet privé - Tous droits réservés

---

## 👥 Équipe

- **Alexandre Lkhaoua** - Product Owner
- **Mathis Baala** - Lead Developer

**Support:** [GitHub Issues](https://github.com/AlexandreLkhaoua/one-wealth/issues)

---

**Dernière mise à jour:** 20 novembre 2025  
**Version:** Sprint 2 Complete ✅

# 🚀 Sprint 2 Complete: Score + Profile + Alerts

## 📋 Description

Cette Pull Request complète le **Sprint 2** du projet OneWealth avec l'implémentation du système de scoring de portefeuille, du profil investisseur et du système d'alertes intelligent.

### ✨ Fonctionnalités principales

#### 1. **Profil Investisseur** 👤
- 4 profils disponibles : **Prudent** (20% actions), **Équilibré** (60%), **Dynamique** (80%), **Agressif** (90%)
- Personnalisation du % d'actions cible (slider 0-100%)
- Configuration horizon de placement et objectif
- UI intuitive avec boutons de sélection + slider
- Endpoints API GET/PATCH avec authentification JWT

#### 2. **Score de Portefeuille** 📊
- **Score global 0-100** (moyenne pondérée de 4 sous-scores)
- **4 Sous-scores détaillés :**
  1. **Diversification** : Basé sur l'index HHI + nombre de secteurs
  2. **Adéquation au profil** : Écart entre allocation réelle vs cible
  3. **Exposition macro** : Analyse USD, Tech, Obligations
  4. **Qualité des supports** : Performance 1Y + volatilité
- Gauge Recharts premium avec animation
- Interface claire avec descriptions pour chaque sous-score

#### 3. **Système d'Alertes Intelligent** 🚨
- **9 types d'alertes** avec 3 niveaux de sévérité :
  - 🔴 **Rouge** : Critique (concentration >70%, mismatch profil >25%)
  - 🟠 **Orange** : Attention (concentration >60%, mismatch >15%)
  - 🟢 **Vert** : OK (portefeuille aligné)
- **Recommandations personnalisées** pour chaque alerte
- Affichage Top 3 alertes importantes dans le dashboard

#### 4. **Intégration Dashboard** 🎨
- 3 nouveaux composants ajoutés au dashboard client :
  - `PortfolioInvestorProfile` : Gestion du profil (gauche)
  - `PortfolioScore` : Gauge de score (centre)
  - `PortfolioAlerts` : Liste d'alertes (droite)
- Layout responsive 3 colonnes (grid LG)
- Animation fluide et design cohérent avec Sprint 1

---

## 🐛 Corrections de bugs critiques

### Bug d'authentification (403 Forbidden)
**Problème :** Les endpoints `/score` et `/profile` retournaient systématiquement 403 Forbidden même pour les utilisateurs légitimes.

**Cause racine :** `supabase.auth.get_user(token)` retourne un objet `User` avec attribut `.id`, mais le code tentait d'accéder à `user['id']` (syntaxe dict). Résultat : comparaison `User(id='xxx')` != `'xxx'` échouait.

**Solution :**
```python
# Extraction correcte du user_id depuis l'objet User
user_obj = getattr(user_resp, 'user', None)
if user_obj:
    if isinstance(user_obj, dict):
        user_id = user_obj.get('id')
    elif hasattr(user_obj, 'id'):
        user_id = user_obj.id if isinstance(user_obj.id, str) else str(user_obj.id)
```

**Fichiers modifiés :**
- `backend/routers/portfolios.py` (endpoints `/score` et `/profile`)
- `backend/services/profile.py` (fonction `get_portfolio_profile`)

### Schemas Pydantic v2
**Problème :** Incompatibilités avec Pydantic v2 (manque de validations, types incorrects).

**Corrections :**
- `Alert.severity` : `str` → `Literal["red", "orange", "green"]`
- `SubScore.description` : Ajout du champ manquant
- `PortfolioScoreResult` : Suppression de `portfolio_id`, ajout de `concentration_top5`
- `InvestorProfileResponse` : Retrait de `portfolio_id`, tous champs requis

### Tests Backend
**Problème :** Tests échouaient après modification de la signature de `get_portfolio_profile()`.

**Solution :** Ajout du paramètre `user_id` dans tous les appels de tests :
```python
# Avant
portfolio = await get_portfolio_profile(supabase, portfolio_id)

# Après  
portfolio = await get_portfolio_profile(supabase, portfolio_id, user_id)
```

---

## 🏗️ Architecture

### Backend (FastAPI)
```
backend/
├── routers/portfolios.py         # +2 endpoints: GET/PATCH /profile, GET /score
├── services/
│   ├── scoring.py                # Calcul score + alertes (500+ lignes)
│   └── profile.py                # CRUD profil investisseur
├── schemas/
│   ├── profile.py                # InvestorProfileUpdate, InvestorProfileResponse
│   └── score.py                  # PortfolioScoreResult, SubScore, Alert
└── tests/
    ├── test_scoring.py           # Tests unitaires scoring
    ├── test_scoring_edgecases.py # Tests edge cases (portfolio vide, volatil)
    └── test_score_endpoint_integration.py # Tests endpoints avec auth
```

### Frontend (Next.js 16)
```
components/
├── portfolio-investor-profile.tsx  # Sélecteur profil + slider
├── portfolio-score.tsx             # Gauge Recharts + 4 sous-scores
└── portfolio-alerts.tsx            # Liste alertes avec badges

app/dashboard/client/[id]/page.tsx  # Intégration des 3 composants

lib/
├── api/client.ts                   # Méthodes API typées
└── types/portfolio.ts              # Types TypeScript (Alert, SubScore, etc.)
```

---

## 🧪 Tests & Validation

### Backend
```bash
PYTHONPATH=backend python -m pytest backend/tests -v
```
**Résultat :** ✅ **7/7 tests passing**

**Couverture :**
- ✅ Calcul du score (happy path)
- ✅ Détection haute concentration
- ✅ Portfolio vide (score 0)
- ✅ Portfolio 100% cash (pénalité risk profile)
- ✅ Actifs très volatils (pénalité qualité)
- ✅ Endpoint /score avec JWT ownership (200)
- ✅ Endpoint /score forbidden (403)

### Frontend
```bash
npx tsc --noEmit
```
**Résultat :** ✅ **0 errors**

### Runtime
- ✅ Backend : `http://localhost:8000` (Uvicorn)
- ✅ Frontend : `http://localhost:3000` (Next.js Turbopack)
- ✅ Score affiché correctement avec gauge animée
- ✅ Profil modifiable et persisté en DB
- ✅ Alertes affichées avec recommandations

---

## 📚 Documentation

### README.md Consolidé
- **400+ lignes** de documentation complète
- Architecture technique détaillée (Backend + Frontend + Database)
- Guide d'installation et démarrage rapide
- Documentation des endpoints API
- Business logic du scoring expliquée
- Troubleshooting section

### Fichiers supprimés (cleanup)
- ❌ `PR_BODY.md` (redondant)
- ❌ `README_SPRINT2.md` (intégré dans README.md)

---

## 🔒 Sécurité

### Ownership Check
Les endpoints `/score` et `/profile` vérifient que l'utilisateur authentifié (via JWT) est bien le propriétaire du portfolio :
```python
# Résolution user_id depuis JWT token
user_id = extract_user_id_from_token(auth_header)

# Vérification ownership
client_user_id = get_client_user_id(portfolio.client_id)
if client_user_id != user_id:
    raise HTTPException(status_code=403, detail="Forbidden")
```

### Mode développement
- ⚠️ **SKIP_OWNERSHIP_CHECK=True** dans `backend/config.py` pour faciliter le dev
- 🚨 **À DÉSACTIVER EN PRODUCTION** avant le merge vers `main`

---

## 📦 Migration Base de Données

**Fichier :** `sql/supabase-migration-sprint2-add-portfolio-profile.sql`

**Colonnes ajoutées à `portfolios` :**
```sql
ALTER TABLE public.portfolios
  ADD COLUMN IF NOT EXISTS investor_profile public.investor_profile DEFAULT 'equilibre',
  ADD COLUMN IF NOT EXISTS target_equity_pct NUMERIC(5,2) DEFAULT 60.0,
  ADD COLUMN IF NOT EXISTS investment_horizon_years integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS objective text DEFAULT 'croissance';
```

**⚠️ À appliquer :** Dans Supabase SQL Editor **AVANT** de merger en production.

---

## 🚀 Comment tester cette PR

### 1. Récupérer la branche
```bash
git fetch origin
git checkout sprint2/score-profile-alerts
```

### 2. Installer les dépendances
```bash
# Frontend
npm install

# Backend
cd backend
pip install -r requirements.txt
```

### 3. Lancer le projet
```bash
# Terminal 1 - Backend
cd backend
source .venv/bin/activate
./start.sh

# Terminal 2 - Frontend
npm run dev
```

### 4. Tester les fonctionnalités
1. Ouvrir `http://localhost:3000`
2. Se connecter avec un compte existant
3. Naviguer vers un client avec portfolio
4. **Vérifier** :
   - ✅ 3 nouvelles cards en bas : Profile / Score / Alerts
   - ✅ Sélectionner un profil → slider se met à jour
   - ✅ Cliquer "Enregistrer" → toast de confirmation
   - ✅ Score affiché avec gauge colorée (rouge/orange/vert)
   - ✅ 4 sous-scores visibles avec descriptions
   - ✅ Alertes affichées avec badges colorés + recommandations

### 5. Lancer les tests
```bash
# Backend tests
cd backend
PYTHONPATH=backend python -m pytest tests -v

# Frontend type check
npx tsc --noEmit
```

---

## ✅ Checklist avant merge

- [x] ✅ Code review complet
- [x] ✅ Tests backend 7/7 passing
- [x] ✅ Tests frontend 0 TypeScript errors
- [x] ✅ Documentation README.md à jour
- [x] ✅ Commit message descriptif
- [ ] ⚠️ **Appliquer migration SQL en production** (`supabase-migration-sprint2-add-portfolio-profile.sql`)
- [ ] ⚠️ **Désactiver SKIP_OWNERSHIP_CHECK** dans `backend/config.py` (ligne 72)
- [ ] 🔄 **Revue de code par Alexandre** (@AlexandreLkhaoua)
- [ ] 🔄 **Tests manuels en production**

---

## 📊 Statistiques

- **Commits :** 3 commits (9c660fb, fc8bfc2, 9a81aa8)
- **Fichiers modifiés :** 22 fichiers
- **Insertions :** +1262 lignes
- **Suppressions :** -605 lignes
- **Nouveaux composants :** 3 (Profile, Score, Alerts)
- **Nouveaux endpoints :** 3 (GET/PATCH /profile, GET /score)
- **Tests :** 7 tests backend passing
- **Durée du sprint :** ~2 jours

---

## 🤝 Contributeurs

- **Mathis Baala** (@mathisbaala) - Développement & debug
- **Alexandre Lkhaoua** (@AlexandreLkhaoua) - Product Owner

---

## 📝 Notes additionnelles

### Points d'attention
1. **Performance** : Le calcul du score peut prendre 100-500ms pour un portfolio de 50+ positions. Envisager un cache Redis en production.
2. **Limites actuelles** : 
   - Données yfinance parfois manquantes (secteur, volatilité)
   - Score peut être biaisé si < 10 positions
3. **Améliorations futures** :
   - Historique des scores (tracking évolution)
   - Alertes par email
   - Recommandations d'actions concrètes (acheter/vendre)

### Dépendances ajoutées
**Backend :**
- Aucune nouvelle dépendance (tout dans `requirements.txt` existant)

**Frontend :**
- Aucune nouvelle dépendance (Recharts déjà présent depuis Sprint 1)

---

**Prêt pour merge ! 🚀**

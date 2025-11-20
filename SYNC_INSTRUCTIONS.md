# 🔄 Instructions de Synchronisation - OneWealth Sprint 2

## 📋 Pour ton collègue Alexandre

Salut Alexandre ! 👋

Le **Sprint 2** est terminé et prêt pour revue. Voici comment récupérer tout le travail :

---

## 🚀 Étape 1 : Récupérer les dernières modifications

```bash
# Se placer dans le projet
cd /path/to/one-wealth

# Récupérer toutes les branches depuis GitHub
git fetch origin

# Voir les branches disponibles
git branch -a
```

Tu devrais voir :
```
* main
  remotes/origin/main
  remotes/origin/sprint2/score-profile-alerts
```

---

## 🔀 Étape 2 : Basculer sur la branche Sprint 2

```bash
# Créer une branche locale trackant la branche distante
git checkout sprint2/score-profile-alerts

# Vérifier que tu es bien à jour
git pull origin sprint2/score-profile-alerts
```

Résultat attendu :
```
Branch 'sprint2/score-profile-alerts' set up to track remote branch 'sprint2/score-profile-alerts' from 'origin'.
Switched to a new branch 'sprint2/score-profile-alerts'
```

---

## 📦 Étape 3 : Installer les dépendances

### Frontend
```bash
# Depuis la racine du projet
npm install
```

### Backend
```bash
cd backend

# Si tu n'as pas encore de venv
python -m venv .venv
source .venv/bin/activate  # macOS/Linux
# .venv\Scripts\activate    # Windows

# Installer les dépendances
pip install -r requirements.txt
```

---

## 🗄️ Étape 4 : Appliquer la migration SQL (IMPORTANT)

**Avant de lancer le projet**, il faut ajouter les nouvelles colonnes dans Supabase :

1. **Ouvrir Supabase Dashboard** : https://supabase.com/dashboard/project/[your-project-id]/editor
2. **Aller dans SQL Editor**
3. **Copier-coller le contenu de** `sql/supabase-migration-sprint2-add-portfolio-profile.sql` :

```sql
-- Migration: add investor profile fields to portfolios
ALTER TABLE public.portfolios
  ADD COLUMN IF NOT EXISTS investor_profile public.investor_profile DEFAULT 'equilibre',
  ADD COLUMN IF NOT EXISTS target_equity_pct NUMERIC(5,2) DEFAULT 60.0,
  ADD COLUMN IF NOT EXISTS investment_horizon_years integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS objective text DEFAULT 'croissance';
```

4. **Cliquer sur "RUN"**
5. Vérifier que les colonnes apparaissent dans la table `portfolios`

---

## ▶️ Étape 5 : Lancer le projet

### Terminal 1 - Backend
```bash
cd backend
source .venv/bin/activate
./start.sh

# Ou manuellement :
# uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Tu devrais voir :
```
🚀 Starting OneWealth API...
Environment: development
Uvicorn running on http://0.0.0.0:8000
```

### Terminal 2 - Frontend
```bash
# Depuis la racine
npm run dev
```

Tu devrais voir :
```
▲ Next.js 16.0.0-canary.1 (Turbopack)
- Local:   http://localhost:3000
```

---

## ✅ Étape 6 : Tester les nouvelles fonctionnalités

1. **Ouvrir** http://localhost:3000
2. **Se connecter** avec ton compte
3. **Aller sur un client** avec un portfolio existant
4. **Scroll en bas de la page** → Tu devrais voir **3 nouvelles cards** :

### Card 1 : Profil Investisseur (gauche)
- 4 boutons : Prudent / Équilibré / Dynamique / Agressif
- Slider pour ajuster le % d'actions cible
- Champs : Horizon (années) et Objectif
- Bouton "Enregistrer"

**Action** : Sélectionne "Dynamique" → Le slider passe à 80% → Clique "Enregistrer"  
**Résultat attendu** : Toast de confirmation "Profil mis à jour" ✅

### Card 2 : Score Portefeuille (centre)
- Gauge circulaire colorée (rouge/orange/vert)
- Score global affiché au centre (ex: 72/100)
- 4 sous-scores listés en dessous :
  - Diversification
  - Risk profile
  - Macro exposure
  - Asset quality

**Action** : Observe le score et les descriptions  
**Résultat attendu** : Score calculé avec détails ✅

### Card 3 : Alertes IA (droite)
- Liste des alertes importantes (max 3)
- Badges colorés (ROUGE / ORANGE / VERT)
- Messages d'alerte + recommandations
- Bouton "Voir le diagnostic" (optionnel)

**Action** : Lis les alertes et recommandations  
**Résultat attendu** : Alertes pertinentes affichées ✅

---

## 🧪 Étape 7 : Lancer les tests (optionnel)

### Tests Backend
```bash
cd backend
PYTHONPATH=backend python -m pytest tests -v
```

**Résultat attendu :** `7 passed` ✅

### Type check Frontend
```bash
npx tsc --noEmit
```

**Résultat attendu :** `0 errors` ✅

---

## 📝 Étape 8 : Revue de code

Voici les fichiers principaux à regarder :

### Backend (FastAPI)
- **`backend/routers/portfolios.py`** : Endpoints `/score` et `/profile` (GET/PATCH)
- **`backend/services/scoring.py`** : Logique de calcul du score (500+ lignes)
- **`backend/services/profile.py`** : CRUD profil investisseur
- **`backend/schemas/score.py`** : Modèles Pydantic (Alert, SubScore, PortfolioScoreResult)
- **`backend/schemas/profile.py`** : Modèles Pydantic profil

### Frontend (Next.js)
- **`components/portfolio-score.tsx`** : Composant gauge Recharts
- **`components/portfolio-investor-profile.tsx`** : Composant sélecteur profil
- **`components/portfolio-alerts.tsx`** : Composant liste alertes
- **`app/dashboard/client/[id]/page.tsx`** : Intégration des 3 composants (lignes 240-249)
- **`lib/api/client.ts`** : Méthodes API `getPortfolioScore()`, `getPortfolioProfile()`, etc.
- **`lib/types/portfolio.ts`** : Types TypeScript (Alert, SubScore, etc.)

### Documentation
- **`README.md`** : Documentation consolidée (400+ lignes)
- **`PULL_REQUEST.md`** : Description complète de la PR
- **`sql/supabase-migration-sprint2-add-portfolio-profile.sql`** : Migration SQL

---

## 🔍 Points d'attention pour la revue

### ⚠️ CRITIQUE : Sécurité
**Fichier :** `backend/config.py` ligne 72
```python
SKIP_OWNERSHIP_CHECK: bool = True  # À DÉSACTIVER EN PROD !
```

**Action requise :** Avant de merger en `main`, mettre à `False` pour activer les ownership checks en production.

### 🐛 Bug fix principal
Le bug d'authentification 403 Forbidden a été corrigé :
- **Problème :** `supabase.auth.get_user()` retournait un objet `User`, pas un dict
- **Solution :** Extraction correcte de `user.id` depuis l'objet
- **Fichiers :** `backend/routers/portfolios.py` (lignes ~428-445 et ~538-555)

### 📊 Business Logic
Le scoring est basé sur :
1. **Diversification** : Index HHI (Herfindahl) + nombre de secteurs
2. **Risk Profile** : Écart entre % actions réel vs cible
3. **Macro Exposure** : Concentration USD, Tech, Obligations
4. **Asset Quality** : Performance 1Y + volatilité

Les seuils sont configurables dans `backend/services/scoring.py`.

---

## ✅ Checklist finale

Avant de merger `sprint2/score-profile-alerts` → `main`, vérifier :

- [ ] Migration SQL appliquée en production (Supabase)
- [ ] `SKIP_OWNERSHIP_CHECK = False` dans `backend/config.py`
- [ ] Tests backend 7/7 passing
- [ ] Tests frontend 0 TypeScript errors
- [ ] Fonctionnalités testées manuellement
- [ ] Documentation README.md lue et approuvée
- [ ] Revue de code complétée
- [ ] Variables d'environnement production configurées

---

## 🆘 En cas de problème

### Backend ne démarre pas
```bash
# Vérifier la config
cd backend
python check_config.py

# Vérifier les credentials Supabase dans .env
cat .env
```

### Frontend affiche "Session expirée"
- Supprimer les cookies du navigateur
- Se reconnecter sur `http://localhost:3000/login`

### Score ne s'affiche pas
- Ouvrir DevTools (F12) → Network
- Chercher l'appel à `/api/portfolios/{id}/score`
- Vérifier le code HTTP (doit être 200, pas 403 ou 500)
- Si 403 : problème d'ownership check
- Si 500 : voir les logs backend

### Tests échouent
```bash
cd backend
PYTHONPATH=backend python -m pytest tests -v --tb=short
```
Regarde les détails des erreurs dans le traceback.

---

## 📞 Contact

Si tu as des questions :
- **Slack** : @mathisbaala
- **Email** : mathis@gmail.com
- **GitHub Issues** : https://github.com/AlexandreLkhaoua/one-wealth/issues

---

**Bon review ! 🚀**

*Dernière mise à jour : 20 novembre 2025*

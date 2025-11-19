# OneWealth - MVP v0.5

OneWealth est une web app destinée aux professionnels de l'investissement (CIF, CGP, banquiers privés) pour visualiser et analyser des portefeuilles d'investissement.

## 🚀 Démarrage rapide

### Installation

Les dépendances sont déjà installées. Si besoin de réinstaller :

```bash
npm install
```

### Lancer l'application en développement

```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

### Build pour la production

```bash
npm run build
npm start
```

## 📂 Structure du projet

```
one-wealth/
├── app/
│   ├── dashboard/
│   │   └── page.tsx          # Page Dashboard avec upload et visualisations
│   ├── layout.tsx             # Layout global avec NavBar et Toaster
│   ├── page.tsx               # Landing page
│   └── globals.css            # Styles globaux Tailwind v4
├── components/
│   ├── ui/                    # Composants shadcn/ui (Button, Card, Table)
│   ├── nav-bar.tsx            # Barre de navigation
│   ├── upload-portfolio.tsx   # Composant d'upload CSV
│   ├── portfolio-summary-cards.tsx  # Cartes de résumé (valeur totale, etc.)
│   ├── portfolio-charts.tsx   # Graphiques (évolution temporelle + pie chart régions)
│   └── portfolio-table.tsx    # Tableau des positions
├── lib/
│   ├── csv/
│   │   └── parsePortfolio.ts  # Logique de parsing CSV avec PapaParse
│   ├── types/
│   │   └── portfolio.ts       # Types TypeScript pour le portefeuille
│   └── utils.ts               # Utilitaires (classnames, etc.)
├── public/
│   └── sample-portfolio.csv   # Fichier CSV d'exemple pour tester
└── package.json
```

## 🧪 Tester l'application

1. Lancez l'application avec `npm run dev`
2. Accédez à la landing page sur [http://localhost:3000](http://localhost:3000)
3. Cliquez sur "Accéder au dashboard"
4. Sur la page Dashboard :
   - Téléchargez le fichier `public/sample-portfolio.csv` depuis le projet
   - Glissez-déposez ce fichier dans la zone d'upload, ou cliquez pour le sélectionner
   - Cliquez sur "Importer mon portefeuille"
5. Vous devriez voir :
   - 3 cartes de résumé en haut (Valeur totale, Par établissement, Par région)
   - Un graphique d'évolution temporelle
   - Un graphique en camembert pour la répartition géographique
   - Un tableau détaillé des 24 positions

## 📊 Format du CSV

Le CSV doit contenir les colonnes suivantes (dans l'ordre) :

```
date,provider,asset_class,instrument_name,isin,region,currency,current_value
```

**Détails des colonnes :**
- `date` : Date au format YYYY-MM-DD
- `provider` : Nom de l'établissement (ex: "Boursorama", "BNP Paribas")
- `asset_class` : Classe d'actif (ex: "Action", "ETF", "Obligation", "Fonds euro", "Cash")
- `instrument_name` : Nom de l'instrument financier
- `isin` : Code ISIN (peut être vide)
- `region` : Région géographique (ex: "Europe", "USA", "Chine", "Pays émergents", "Autres")
- `currency` : Devise (pour la V0.5, toujours EUR)
- `current_value` : Valeur actuelle en EUR (nombre décimal)

**Exemple de ligne :**
```csv
2024-01-15,Boursorama,Action,Apple Inc.,US0378331005,USA,EUR,4500.00
```

## 🛠️ Stack technique

- **Next.js 15** (App Router, React 19, TypeScript)
- **Tailwind CSS v4** pour le styling
- **shadcn/ui** + **Radix UI** pour les composants
- **Framer Motion** pour les animations
- **Recharts** pour les graphiques
- **PapaParse** pour le parsing CSV
- **Sonner** pour les notifications toast
- **Lucide React** pour les icônes

## 🎨 Fonctionnalités principales

### Landing Page
- Hero avec titre et description
- Section "Pour qui ?" avec 3 cartes
- CTA vers le dashboard

### Dashboard
- Upload de fichier CSV (drag & drop ou sélection)
- Validation du format et de la taille
- Parsing côté client avec gestion d'erreurs
- Affichage des résumés en cartes
- Graphique d'évolution temporelle de la valeur
- Graphique de répartition géographique (pie chart)
- Tableau détaillé de toutes les positions

## 🧹 Notes importantes

- **Pas de backend** : tout fonctionne côté client
- **Toutes les valeurs en EUR** : pas de conversion multi-devises pour la V0.5
- **Quick & dirty** : MVP conçu pour aller vite tout en restant propre et lisible
- **Design épuré** : pas de surcharge visuelle, focus sur la clarté

## 📝 Prochaines étapes (hors scope V0.5)

- Persistance des données (localStorage / backend)
- Export des analyses en PDF
- Conversion multi-devises réelle
- Filtres et tri dans le tableau
- Comparaison de portefeuilles
- Recommandations personnalisées

## 📄 Licence

Propriétaire - Projet OneWealth


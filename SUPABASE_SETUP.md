# 🔐 Configuration de l'authentification OneWealth avec Supabase

## 📋 Étapes de configuration

### 1. Créer un projet Supabase

1. Va sur [supabase.com](https://supabase.com)
2. Clique sur "New Project"
3. Nomme ton projet : `onewealth`
4. Choisis une région proche (ex: Europe West)
5. Définis un mot de passe de base de données (note-le bien !)
6. Attends que le projet soit créé (environ 2 minutes)

### 2. Exécuter le schéma SQL

1. Dans ton projet Supabase, va dans **SQL Editor** (menu latéral)
2. Clique sur "New Query"
3. Copie-colle **TOUT** le contenu du fichier `supabase-schema.sql`
4. Clique sur **Run** (ou Ctrl/Cmd + Enter)
5. Vérifie que le message "Schema created successfully!" s'affiche

### 3. Configurer l'authentification Email/Password

1. Va dans **Authentication** → **Providers** (menu latéral)
2. Assure-toi que **Email** est activé (il l'est par défaut)
3. **IMPORTANT** : Désactive la confirmation par email (pour simplifier le MVP)
   - Va dans **Authentication** → **Settings**
   - Sous "Email Auth", **désactive** "Enable email confirmations"
   - Sauvegarde

### 4. Récupérer les clés API

1. Va dans **Settings** → **API** (menu latéral)
2. Tu verras deux clés importantes :
   - **Project URL** (commence par `https://`)
   - **anon/public key** (longue chaîne de caractères)

### 5. Configurer les variables d'environnement

1. Dans le projet OneWealth, copie `.env.local.example` vers `.env.local` :
   ```bash
   cp .env.local.example .env.local
   ```

2. Ouvre `.env.local` et remplis les valeurs :
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://ton-projet.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=ta-clé-anon-très-longue
   ```

3. Sauvegarde le fichier

### 6. Redémarrer le serveur de développement

```bash
npm run dev
```

## ✅ Tester l'authentification

### Créer un compte (Signup)

1. Va sur http://localhost:3000/signup
2. Remplis le formulaire :
   - Nom complet : `Jean Dupont`
   - Email : `test@example.com`
   - Mot de passe : minimum 6 caractères
3. Clique sur "S'inscrire"
4. Tu devrais être redirigé vers `/dashboard`

### Vérifier dans Supabase

1. Va dans **Authentication** → **Users**
2. Tu devrais voir ton utilisateur créé
3. Va dans **Table Editor** → **users**
4. Tu devrais voir le profil créé avec le nom complet

### Se connecter (Login)

1. Déconnecte-toi (bouton dans la NavBar)
2. Va sur http://localhost:3000/login
3. Entre les mêmes identifiants
4. Tu devrais être redirigé vers `/dashboard`

## 🔒 Sécurité - Row Level Security (RLS)

Le schéma SQL a déjà configuré :

✅ **RLS activé** sur toutes les tables  
✅ **Policies** : Chaque utilisateur voit uniquement ses données  
✅ **Cascade deletes** : Suppression propre des données liées  
✅ **Protection du dashboard** : Middleware Next.js

## 🐛 Dépannage

### Erreur "Invalid API key"
→ Vérifie que tu as bien copié la clé `anon` (pas la clé `service_role`)

### Erreur "Failed to fetch"
→ Vérifie que l'URL Supabase est correcte et commence par `https://`

### Redirection infinie
→ Vide le cache du navigateur et les cookies

### L'utilisateur n'apparaît pas dans la table `users`
→ Exécute manuellement :
```sql
INSERT INTO public.users (id, email, full_name, role)
VALUES ('user-id-from-auth', 'email@example.com', 'Nom', 'advisor');
```

## 📚 Prochaines étapes

Une fois l'authentification fonctionnelle :

1. ✅ Connecter le Dashboard aux données Supabase
2. ✅ Créer des clients
3. ✅ Sauvegarder les portefeuilles dans la DB
4. ✅ Implémenter l'import CSV vers Supabase

## 🔗 Ressources

- [Documentation Supabase Auth](https://supabase.com/docs/guides/auth)
- [Next.js + Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

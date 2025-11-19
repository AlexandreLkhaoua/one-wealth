-- =====================================================
-- MIGRATION : Créer les profils pour utilisateurs existants
-- =====================================================
-- Ce script crée les profils manquants pour les utilisateurs
-- qui se sont inscrits avant la mise en place du trigger

INSERT INTO public.users (id, email, full_name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', 'Utilisateur') as full_name,
  'advisor' as role
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
WHERE u.id IS NULL;

-- Vérifier que tous les utilisateurs ont maintenant un profil
SELECT 
  au.id,
  au.email,
  u.full_name,
  u.role,
  u.created_at
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
ORDER BY au.created_at DESC;

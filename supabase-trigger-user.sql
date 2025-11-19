-- =====================================================
-- TRIGGER AUTOMATIQUE : Créer le profil utilisateur
-- =====================================================
-- Ce trigger crée automatiquement un profil dans public.users
-- quand un nouvel utilisateur s'inscrit via Supabase Auth

-- Fonction qui crée le profil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Utilisateur'),
    'advisor'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger qui s'exécute après chaque inscription
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- TEST (optionnel - à supprimer après test)
-- =====================================================
-- Pour tester, tu peux vérifier que les utilisateurs existants ont un profil :
-- SELECT au.id, au.email, u.full_name 
-- FROM auth.users au
-- LEFT JOIN public.users u ON u.id = au.id;

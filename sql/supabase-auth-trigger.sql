-- =====================================================
-- ONEWEALTH - AUTH TRIGGER
-- =====================================================
-- Ce fichier crée le trigger pour synchroniser auth.users avec public.users
-- À exécuter APRÈS supabase-migration-sprint1.sql
-- =====================================================

-- =====================================================
-- 1. FONCTION : Créer un profil utilisateur après inscription
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'member'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. TRIGGER : Appeler la fonction après création d'un user
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 3. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- =====================================================
-- ✅ AUTH TRIGGER CONFIGURÉ
-- =====================================================

-- Pour tester : crée un utilisateur via l'interface ou l'API
-- et vérifie qu'il apparaît dans public.users

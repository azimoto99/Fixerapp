-- Fix RLS helper functions to properly read session variables

-- ============================================
-- FIX get_current_user_id() FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS INTEGER AS $$
DECLARE
  user_id_text TEXT;
  user_id INTEGER;
BEGIN
  -- Get the user ID from the session context
  BEGIN
    user_id_text := current_setting('app.current_user_id', true);
    
    -- Handle empty string or null
    IF user_id_text IS NULL OR user_id_text = '' THEN
      RETURN 0;
    END IF;
    
    -- Convert to integer
    user_id := user_id_text::INTEGER;
    
    -- Ensure we have a valid user ID
    IF user_id IS NULL OR user_id <= 0 THEN
      RETURN 0;
    END IF;
    
    RETURN user_id;
    
  EXCEPTION WHEN OTHERS THEN
    -- If any error occurs, return 0 (no access)
    RETURN 0;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FIX is_admin() FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  admin_text TEXT;
  user_id INTEGER;
BEGIN
  -- First check if admin flag is set in session
  BEGIN
    admin_text := current_setting('app.is_admin', true);
    IF admin_text = 'true' THEN
      RETURN true;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Continue to database check
  END;
  
  -- Also check database for admin status
  user_id := get_current_user_id();
  IF user_id > 0 THEN
    RETURN EXISTS (
      SELECT 1 FROM users 
      WHERE id = user_id 
      AND is_admin = true 
      AND is_active = true
    );
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FIX has_admin_permission() FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION has_admin_permission(permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_id INTEGER;
BEGIN
  -- If user is admin, they have all permissions
  IF is_admin() THEN
    RETURN true;
  END IF;
  
  user_id := get_current_user_id();
  IF user_id <= 0 THEN
    RETURN false;
  END IF;
  
  -- Check specific admin permissions
  RETURN EXISTS (
    SELECT 1 FROM admin_users au
    JOIN users u ON au.user_id = u.id
    WHERE u.id = user_id
    AND au.is_active = true
    AND u.is_active = true
    AND (
      au.role = 'super_admin' OR
      permission_name = ANY(au.permissions)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FIX has_valid_rls_context() FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION has_valid_rls_context()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_current_user_id() > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TEST THE FIXED FUNCTIONS
-- ============================================

-- Test the functions work correctly
DO $$
DECLARE
  test_user_id INTEGER;
  test_admin BOOLEAN;
BEGIN
  -- Test 1: Clear context
  PERFORM set_config('app.current_user_id', '', true);
  PERFORM set_config('app.is_admin', 'false', true);
  
  test_user_id := get_current_user_id();
  test_admin := is_admin();
  
  RAISE NOTICE 'Test 1 - No context: user_id=%, is_admin=%', test_user_id, test_admin;
  
  -- Test 2: Set user context
  PERFORM set_config('app.current_user_id', '123', true);
  PERFORM set_config('app.is_admin', 'false', true);
  
  test_user_id := get_current_user_id();
  test_admin := is_admin();
  
  RAISE NOTICE 'Test 2 - User context: user_id=%, is_admin=%', test_user_id, test_admin;
  
  -- Test 3: Set admin context
  PERFORM set_config('app.current_user_id', '456', true);
  PERFORM set_config('app.is_admin', 'true', true);
  
  test_user_id := get_current_user_id();
  test_admin := is_admin();
  
  RAISE NOTICE 'Test 3 - Admin context: user_id=%, is_admin=%', test_user_id, test_admin;
END;
$$;

-- Log the function fix
INSERT INTO audit_logs (action, resource_type, resource_id, details, success)
VALUES (
  'rls_functions_fixed',
  'database',
  'helper_functions',
  '{"message": "Fixed RLS helper functions to properly read session variables"}',
  true
);

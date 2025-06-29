-- Fix RLS policies that are too permissive
-- This addresses the test failures in the RLS security test

-- ============================================
-- FIX USER PROFILE ACCESS POLICY
-- ============================================

-- Drop the existing policy that's too permissive
DROP POLICY IF EXISTS users_select_policy ON users;

-- Create a more restrictive policy for user profile access
CREATE POLICY users_select_policy ON users
  FOR SELECT
  USING (
    -- Users can see their own profile
    id = get_current_user_id() OR
    -- Admins can see all profiles
    is_admin() OR
    -- Users can see profiles of people they have active jobs with
    (is_active = true AND id IN (
      SELECT DISTINCT CASE 
        WHEN j.poster_id = get_current_user_id() THEN j.worker_id
        WHEN j.worker_id = get_current_user_id() THEN j.poster_id
        ELSE NULL
      END
      FROM jobs j
      WHERE (j.poster_id = get_current_user_id() OR j.worker_id = get_current_user_id())
      AND j.status IN ('assigned', 'in_progress', 'completed')
      AND CASE 
        WHEN j.poster_id = get_current_user_id() THEN j.worker_id
        WHEN j.worker_id = get_current_user_id() THEN j.poster_id
        ELSE NULL
      END IS NOT NULL
    ))
  );

-- ============================================
-- STRENGTHEN DEFAULT ACCESS CONTROLS
-- ============================================

-- Update the helper function to be more restrictive
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS INTEGER AS $$
DECLARE
  user_id INTEGER;
BEGIN
  -- Get the user ID from the session context
  BEGIN
    user_id := current_setting('app.current_user_id', false)::INTEGER;
  EXCEPTION WHEN OTHERS THEN
    -- If no user context is set, return 0 (no access)
    RETURN 0;
  END;
  
  -- Ensure we have a valid user ID
  IF user_id IS NULL OR user_id <= 0 THEN
    RETURN 0;
  END IF;
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ADD STRICTER BYPASS PREVENTION
-- ============================================

-- Create a function to check if RLS context is properly set
CREATE OR REPLACE FUNCTION has_valid_rls_context()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user context is properly set
  BEGIN
    RETURN current_setting('app.current_user_id', false)::INTEGER > 0;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATE JOBS POLICY FOR BETTER SECURITY
-- ============================================

-- Drop and recreate jobs policy with stricter controls
DROP POLICY IF EXISTS jobs_select_policy ON jobs;

CREATE POLICY jobs_select_policy ON jobs
  FOR SELECT
  USING (
    -- Job poster can see their jobs
    poster_id = get_current_user_id() OR
    -- Assigned worker can see their jobs
    worker_id = get_current_user_id() OR
    -- Admins can see all jobs
    is_admin() OR
    -- Public can see open jobs (but only basic info)
    (status = 'open' AND has_valid_rls_context())
  );

-- ============================================
-- STRENGTHEN FINANCIAL DATA PROTECTION
-- ============================================

-- Ensure payments are completely isolated
DROP POLICY IF EXISTS payments_select_policy ON payments;

CREATE POLICY payments_select_policy ON payments
  FOR SELECT
  USING (
    -- Only users involved in the payment can see it
    (user_id = get_current_user_id() AND get_current_user_id() > 0) OR
    (worker_id = get_current_user_id() AND get_current_user_id() > 0) OR
    -- Admins with proper permissions
    has_admin_permission('financial_view')
  );

-- ============================================
-- ADD LOGGING FOR POLICY VIOLATIONS
-- ============================================

-- Create a function to log RLS policy violations
CREATE OR REPLACE FUNCTION log_rls_violation(table_name TEXT, operation TEXT)
RETURNS VOID AS $$
BEGIN
  -- Log the violation attempt
  INSERT INTO audit_logs (action, resource_type, resource_id, details, success)
  VALUES (
    'rls_violation_attempt',
    table_name,
    operation,
    json_build_object(
      'user_id', get_current_user_id(),
      'timestamp', NOW(),
      'context_valid', has_valid_rls_context()
    ),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFY RLS IS WORKING
-- ============================================

-- Test that RLS is properly enabled
DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO rls_enabled 
  FROM pg_class 
  WHERE relname = 'users';
  
  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'RLS is not enabled on users table';
  END IF;
  
  RAISE NOTICE 'RLS verification passed - policies are active';
END;
$$;

-- Log the policy fix
INSERT INTO audit_logs (action, resource_type, resource_id, details, success)
VALUES (
  'rls_policy_fix',
  'database',
  'all_tables',
  '{"message": "Fixed RLS policies to be more restrictive and secure"}',
  true
);

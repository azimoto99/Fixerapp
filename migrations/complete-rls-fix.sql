-- Complete RLS Fix - Ensure ALL tables have RLS enabled and proper policies
-- This script addresses the "fails after a while" issue by ensuring comprehensive RLS coverage

-- ============================================
-- FORCE ENABLE RLS ON ALL TABLES (IDEMPOTENT)
-- ============================================

-- Core tables
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks ENABLE ROW LEVEL SECURITY;

-- Financial tables
ALTER TABLE IF EXISTS earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS refunds ENABLE ROW LEVEL SECURITY;

-- Communication tables
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contacts ENABLE ROW LEVEL SECURITY;

-- Notification and badge tables
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_badges ENABLE ROW LEVEL SECURITY;

-- Support and moderation tables
ALTER TABLE IF EXISTS support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_strikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS feedback ENABLE ROW LEVEL SECURITY;

-- Admin tables
ALTER TABLE IF EXISTS admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS platform_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Enterprise tables
ALTER TABLE IF EXISTS enterprise_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS hub_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS enterprise_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS enterprise_applications ENABLE ROW LEVEL SECURITY;

-- Session table
ALTER TABLE IF EXISTS sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ENSURE ALL TABLES HAVE DEFAULT DENY POLICY
-- ============================================

-- Create a default deny policy for any table that might not have proper policies
DO $$
DECLARE
    table_name TEXT;
    policy_exists BOOLEAN;
BEGIN
    FOR table_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
    LOOP
        -- Check if table has any SELECT policies
        SELECT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = table_name 
            AND cmd = 'SELECT'
        ) INTO policy_exists;
        
        -- If no SELECT policy exists, create a restrictive default
        IF NOT policy_exists THEN
            BEGIN
                EXECUTE format('CREATE POLICY %I_default_deny ON %I FOR SELECT USING (false)', 
                    table_name || '_default_deny', table_name);
                RAISE NOTICE 'Created default deny policy for table: %', table_name;
            EXCEPTION WHEN duplicate_object THEN
                -- Policy already exists, continue
            END;
        END IF;
    END LOOP;
END;
$$;

-- ============================================
-- ENHANCE HELPER FUNCTIONS FOR RELIABILITY
-- ============================================

-- Enhanced function to get current user ID with better error handling
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS INTEGER AS $$
DECLARE
    user_id_text TEXT;
    user_id INTEGER;
BEGIN
    -- Try to get user ID from session context
    BEGIN
        user_id_text := current_setting('app.current_user_id', true);
        
        -- Handle various empty/null cases
        IF user_id_text IS NULL OR user_id_text = '' OR user_id_text = '0' THEN
            RETURN 0;
        END IF;
        
        -- Try to convert to integer
        user_id := user_id_text::INTEGER;
        
        -- Ensure valid positive user ID
        IF user_id IS NULL OR user_id <= 0 THEN
            RETURN 0;
        END IF;
        
        RETURN user_id;
        
    EXCEPTION 
        WHEN invalid_text_representation THEN
            RETURN 0;
        WHEN OTHERS THEN
            RETURN 0;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Enhanced admin check function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    admin_text TEXT;
    user_id INTEGER;
BEGIN
    -- Check session flag first for performance
    BEGIN
        admin_text := current_setting('app.is_admin', true);
        IF admin_text = 'true' THEN
            RETURN true;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Continue to database check
    END;
    
    -- Get user ID and check database
    user_id := get_current_user_id();
    IF user_id > 0 THEN
        BEGIN
            RETURN EXISTS (
                SELECT 1 FROM users 
                WHERE id = user_id 
                AND is_admin = true 
                AND is_active = true
            );
        EXCEPTION WHEN OTHERS THEN
            RETURN false;
        END;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user has valid RLS context
CREATE OR REPLACE FUNCTION has_valid_rls_context()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_current_user_id() > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check admin permissions
CREATE OR REPLACE FUNCTION has_admin_permission(permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_id INTEGER;
BEGIN
    -- Super admins have all permissions
    IF is_admin() THEN
        RETURN true;
    END IF;
    
    user_id := get_current_user_id();
    IF user_id <= 0 THEN
        RETURN false;
    END IF;
    
    -- Check specific permissions in admin_users table
    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
        RETURN false;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- MISSING POLICIES FOR SPECIFIC TABLES
-- ============================================

-- Conversation participants policies
DROP POLICY IF EXISTS conversation_participants_select_policy ON conversation_participants;
CREATE POLICY conversation_participants_select_policy ON conversation_participants
FOR SELECT USING (
    user_id = get_current_user_id() OR
    is_admin() OR
    conversation_id IN (
        SELECT id FROM conversations WHERE created_by = get_current_user_id()
    )
);

DROP POLICY IF EXISTS conversation_participants_insert_policy ON conversation_participants;
CREATE POLICY conversation_participants_insert_policy ON conversation_participants
FOR INSERT WITH CHECK (
    user_id = get_current_user_id() OR
    is_admin() OR
    conversation_id IN (
        SELECT id FROM conversations WHERE created_by = get_current_user_id()
    )
);

-- Message read receipts policies
DROP POLICY IF EXISTS message_read_receipts_select_policy ON message_read_receipts;
CREATE POLICY message_read_receipts_select_policy ON message_read_receipts
FOR SELECT USING (
    user_id = get_current_user_id() OR
    is_admin() OR
    message_id IN (
        SELECT id FROM messages WHERE sender_id = get_current_user_id()
    )
);

DROP POLICY IF EXISTS message_read_receipts_insert_policy ON message_read_receipts;
CREATE POLICY message_read_receipts_insert_policy ON message_read_receipts
FOR INSERT WITH CHECK (user_id = get_current_user_id() OR is_admin());

-- Ensure all insert/update/delete policies exist for core tables
DROP POLICY IF EXISTS users_insert_policy ON users;
CREATE POLICY users_insert_policy ON users
FOR INSERT WITH CHECK (
    is_admin() OR 
    get_current_user_id() = 0 OR  -- Allow during registration
    id = get_current_user_id()
);

DROP POLICY IF EXISTS users_update_policy ON users;
CREATE POLICY users_update_policy ON users
FOR UPDATE USING (
    id = get_current_user_id() OR is_admin()
);

DROP POLICY IF EXISTS users_delete_policy ON users;
CREATE POLICY users_delete_policy ON users
FOR DELETE USING (is_admin());

-- Jobs policies
DROP POLICY IF EXISTS jobs_insert_policy ON jobs;
CREATE POLICY jobs_insert_policy ON jobs
FOR INSERT WITH CHECK (
    poster_id = get_current_user_id() OR is_admin()
);

DROP POLICY IF EXISTS jobs_update_policy ON jobs;
CREATE POLICY jobs_update_policy ON jobs
FOR UPDATE USING (
    poster_id = get_current_user_id() OR 
    worker_id = get_current_user_id() OR 
    is_admin()
);

DROP POLICY IF EXISTS jobs_delete_policy ON jobs;
CREATE POLICY jobs_delete_policy ON jobs
FOR DELETE USING (
    poster_id = get_current_user_id() OR is_admin()
);

-- ============================================
-- VERIFY RLS IS WORKING
-- ============================================

-- Test that RLS blocks access without proper context
DO $$
DECLARE
    user_count INTEGER;
    job_count INTEGER;
BEGIN
    -- Clear any existing context
    PERFORM set_config('app.current_user_id', '0', true);
    PERFORM set_config('app.is_admin', 'false', true);
    
    -- Test users table
    SELECT COUNT(*) INTO user_count FROM users;
    IF user_count > 0 THEN
        RAISE WARNING 'RLS may not be working on users table - found % users without context', user_count;
    END IF;
    
    -- Test jobs table
    SELECT COUNT(*) INTO job_count FROM jobs;
    IF job_count > 0 THEN
        RAISE WARNING 'RLS may not be working on jobs table - found % jobs without context', job_count;
    END IF;
    
    RAISE NOTICE 'RLS verification complete. Users visible: %, Jobs visible: %', user_count, job_count;
END;
$$;

-- ============================================
-- FORCE ROW SECURITY FOR ALL USERS
-- ============================================

-- Ensure RLS is enforced even for superusers
-- Note: This requires superuser privileges, may need to be run separately
-- ALTER DATABASE current_database() SET row_security = on;

-- Log the comprehensive RLS fix
INSERT INTO audit_logs (action, resource_type, resource_id, details, success)
VALUES (
    'complete_rls_fix',
    'database',
    'all_tables',
    '{"message": "Applied comprehensive RLS fix to ensure all tables have proper security policies and enforcement"}',
    true
);

-- Show final RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'ENABLED'
        ELSE 'DISABLED'
    END as status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public'
AND tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
ORDER BY tablename;
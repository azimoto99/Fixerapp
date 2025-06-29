-- Comprehensive RLS verification script

-- Check current user and privileges
SELECT 'Current user info:' as info;
SELECT current_user, session_user, 
       pg_has_role(current_user, 'rds_superuser', 'member') as is_rds_superuser,
       usesuper as is_superuser
FROM pg_user WHERE usename = current_user;

-- Check RLS settings
SELECT 'RLS settings:' as info;
SELECT current_setting('row_security') as row_security_global;

-- Force RLS even for superuser
SET row_security = force;

-- Check table RLS status
SELECT 'Table RLS status:' as info;
SELECT schemaname, tablename, rowsecurity, relrowsecurity 
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE tablename IN ('users', 'jobs', 'payments')
AND schemaname = 'public';

-- Test 1: Clear context and test
SELECT 'Test 1: Clearing context' as test;
SELECT set_config('app.current_user_id', '', true);
SELECT set_config('app.is_admin', 'false', true);

-- This should return 0 rows if RLS is working
SELECT 'Users visible with no context:' as test, count(*) FROM public.users;

-- Test 2: Set invalid context
SELECT 'Test 2: Invalid context' as test;
SELECT set_config('app.current_user_id', '0', true);
SELECT 'Users visible with user_id=0:' as test, count(*) FROM public.users;

-- Test 3: Set valid user context
SELECT 'Test 3: Valid user context' as test;
SELECT set_config('app.current_user_id', '1', true);
SELECT 'Users visible with user_id=1:' as test, count(*) FROM public.users;

-- Test 4: Admin context
SELECT 'Test 4: Admin context' as test;
SELECT set_config('app.is_admin', 'true', true);
SELECT 'Users visible with admin=true:' as test, count(*) FROM public.users;

-- Show current policies
SELECT 'Current policies on users table:' as info;
SELECT policyname, cmd, permissive, roles, qual 
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

-- Test the helper functions directly
SELECT 'Helper function tests:' as info;
SELECT get_current_user_id() as current_user_id_func;
SELECT is_admin() as is_admin_func;
SELECT has_valid_rls_context() as has_valid_context_func;

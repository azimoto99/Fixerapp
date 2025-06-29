-- Create much stricter RLS policies that properly block unauthorized access

-- ============================================
-- STRICT USER ACCESS POLICY
-- ============================================

-- Drop existing policy
DROP POLICY IF EXISTS users_select_policy ON users;

-- Create very strict policy
CREATE POLICY users_select_policy ON users
  FOR SELECT
  USING (
    -- Must have valid user context (> 0)
    get_current_user_id() > 0 AND (
      -- Users can see their own profile
      id = get_current_user_id() OR
      -- Admins can see all profiles
      is_admin()
      -- Removed the job-based visibility for now to ensure strict isolation
    )
  );

-- ============================================
-- STRICT JOBS POLICY
-- ============================================

DROP POLICY IF EXISTS jobs_select_policy ON jobs;

CREATE POLICY jobs_select_policy ON jobs
  FOR SELECT
  USING (
    -- Must have valid user context
    get_current_user_id() > 0 AND (
      -- Job poster can see their jobs
      poster_id = get_current_user_id() OR
      -- Assigned worker can see their jobs
      worker_id = get_current_user_id() OR
      -- Admins can see all jobs
      is_admin() OR
      -- Open jobs are visible to authenticated users only
      status = 'open'
    )
  );

-- ============================================
-- STRICT PAYMENTS POLICY
-- ============================================

DROP POLICY IF EXISTS payments_select_policy ON payments;

CREATE POLICY payments_select_policy ON payments
  FOR SELECT
  USING (
    -- Must have valid user context
    get_current_user_id() > 0 AND (
      -- Only users involved in the payment can see it
      user_id = get_current_user_id() OR
      worker_id = get_current_user_id() OR
      -- Admins with proper permissions
      has_admin_permission('financial_view')
    )
  );

-- ============================================
-- STRICT APPLICATIONS POLICY
-- ============================================

DROP POLICY IF EXISTS applications_select_policy ON applications;

CREATE POLICY applications_select_policy ON applications
  FOR SELECT
  USING (
    -- Must have valid user context
    get_current_user_id() > 0 AND (
      -- Worker who submitted the application
      worker_id = get_current_user_id() OR
      -- Job poster can see applications for their jobs
      job_id IN (
        SELECT id FROM jobs WHERE poster_id = get_current_user_id()
      ) OR
      -- Admins can see all
      is_admin()
    )
  );

-- ============================================
-- STRICT MESSAGES POLICY
-- ============================================

DROP POLICY IF EXISTS messages_select_policy ON messages;

CREATE POLICY messages_select_policy ON messages
  FOR SELECT
  USING (
    -- Must have valid user context
    get_current_user_id() > 0 AND (
      -- Sender can see their messages
      sender_id = get_current_user_id() OR
      -- Recipient can see messages sent to them
      recipient_id = get_current_user_id() OR
      -- Conversation participants can see messages
      conversation_id IN (
        SELECT conversation_id FROM conversation_participants 
        WHERE user_id = get_current_user_id() AND is_active = true
      ) OR
      -- Admins can see all
      is_admin()
    )
  );

-- ============================================
-- STRICT NOTIFICATIONS POLICY
-- ============================================

DROP POLICY IF EXISTS notifications_select_policy ON notifications;

CREATE POLICY notifications_select_policy ON notifications
  FOR SELECT
  USING (
    -- Must have valid user context
    get_current_user_id() > 0 AND (
      -- Users can only see their own notifications
      user_id = get_current_user_id() OR
      -- Admins can see all
      is_admin()
    )
  );

-- ============================================
-- TEST THE STRICT POLICIES
-- ============================================

-- Test that policies block access without context
DO $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Clear any existing context
  PERFORM set_config('app.current_user_id', '0', true);
  PERFORM set_config('app.is_admin', 'false', true);
  
  -- Try to count users - should be 0 with strict RLS
  SELECT COUNT(*) INTO user_count FROM users;
  
  IF user_count > 0 THEN
    RAISE WARNING 'RLS may not be strict enough - found % users without context', user_count;
  ELSE
    RAISE NOTICE 'RLS is working correctly - no users visible without context';
  END IF;
END;
$$;

-- Log the strict policy implementation
INSERT INTO audit_logs (action, resource_type, resource_id, details, success)
VALUES (
  'rls_strict_policies',
  'database',
  'all_tables',
  '{"message": "Applied strict RLS policies that require valid user context"}',
  true
);

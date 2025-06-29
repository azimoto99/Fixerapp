# Row Level Security (RLS) Implementation Guide

## Overview

This guide explains how to implement Row Level Security (RLS) in your Fixer application to ensure data isolation and security at the database level.

## What is Row Level Security?

RLS is a PostgreSQL feature that allows you to control which rows users can access in database tables. It works by creating policies that filter data based on the current user context.

## Security Benefits

- **Data Isolation**: Users can only access their own data
- **Multi-tenancy**: Safe data separation between different user types
- **Defense in Depth**: Database-level security even if application logic fails
- **Compliance**: Helps meet data privacy regulations
- **Audit Trail**: Built-in security logging

## Implementation Steps

### 1. Apply the RLS Migration

```bash
# Run the RLS setup script
./scripts/apply-rls-security.sh
```

This will:
- Enable RLS on all tables
- Create security policies for each table
- Set up helper functions for user context

### 2. Update Your Express Application

Add the RLS middleware to your main server file:

```typescript
import { setRLSContext } from './middleware/rls-context';
import { authWithRLS, requireAuth, requireAdmin } from './middleware/auth-rls';

// Apply RLS context to all authenticated routes
app.use('/api', authWithRLS);

// Use enhanced auth middleware for protected routes
app.use('/api/admin', requireAdmin);
app.use('/api/jobs', requireAuth);
```

### 3. Update Route Handlers

Replace standard authentication checks with RLS-aware middleware:

```typescript
// Before (old way)
app.get('/api/jobs', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Handle request
});

// After (with RLS)
app.get('/api/jobs', requireAuth, (req, res) => {
  // User context is automatically set
  // Database queries will respect RLS policies
});
```

### 4. Service Layer Updates

For service methods that need elevated privileges:

```typescript
import { withAdminContext, requiresAdmin } from '../middleware/rls-context';

class AdminService {
  // Method decorator for admin-only operations
  @requiresAdmin
  async getAllUsers() {
    return await db.select().from(users);
  }
  
  // Manual admin context
  async performSystemOperation() {
    return await withAdminContext(async () => {
      // This runs with admin privileges
      return await db.select().from(users);
    });
  }
}
```

## RLS Policies Explained

### User Data Access

```sql
-- Users can only see their own profile and public profiles of connected users
CREATE POLICY users_select_policy ON users
  FOR SELECT
  USING (
    id = get_current_user_id() OR
    is_admin() OR
    (is_active = true AND id IN (
      SELECT DISTINCT CASE 
        WHEN j.poster_id = get_current_user_id() THEN j.worker_id
        WHEN j.worker_id = get_current_user_id() THEN j.poster_id
      END
      FROM jobs j
      WHERE j.poster_id = get_current_user_id() OR j.worker_id = get_current_user_id()
    ))
  );
```

### Job Access Control

```sql
-- Users can view jobs they posted, applied to, or are assigned to
CREATE POLICY jobs_select_policy ON jobs
  FOR SELECT
  USING (
    poster_id = get_current_user_id() OR
    worker_id = get_current_user_id() OR
    is_admin() OR
    status = 'open'
  );
```

### Financial Data Protection

```sql
-- Users can only see their own financial records
CREATE POLICY payments_select_policy ON payments
  FOR SELECT
  USING (
    user_id = get_current_user_id() OR
    worker_id = get_current_user_id() OR
    has_admin_permission('financial_view')
  );
```

## Testing RLS Implementation

### 1. Test User Isolation

```typescript
// Test that users can't see other users' data
const user1Jobs = await db.select().from(jobs).where(eq(jobs.posterId, user1.id));
const user2Jobs = await db.select().from(jobs).where(eq(jobs.posterId, user2.id));

// User 1 should not see User 2's jobs
expect(user2Jobs).toHaveLength(0);
```

### 2. Test Admin Access

```typescript
// Test admin can see all data
await withAdminContext(async () => {
  const allJobs = await db.select().from(jobs);
  expect(allJobs.length).toBeGreaterThan(0);
});
```

### 3. Test Policy Violations

```typescript
// This should fail with RLS enabled
try {
  await db.insert(jobs).values({
    posterId: otherUserId, // Trying to create job for another user
    title: "Test Job"
  });
  fail('Should have thrown RLS violation');
} catch (error) {
  expect(error.message).toContain('policy');
}
```

## Common Issues and Solutions

### Issue: "permission denied for table" errors

**Solution**: Ensure the RLS context is set before database operations:

```typescript
// Wrong
const jobs = await db.select().from(jobs);

// Correct
app.get('/api/jobs', requireAuth, async (req, res) => {
  const jobs = await db.select().from(jobs);
});
```

### Issue: Admin operations failing

**Solution**: Use admin context for system operations:

```typescript
// Wrong
const allUsers = await db.select().from(users);

// Correct
const allUsers = await withAdminContext(() => 
  db.select().from(users)
);
```

### Issue: Public data not accessible

**Solution**: Use optional auth for public endpoints:

```typescript
app.get('/api/public/jobs', optionalAuth, async (req, res) => {
  // Public jobs are accessible even without authentication
});
```

## Security Best Practices

### 1. Principle of Least Privilege
- Users only access data they need
- Admin privileges are explicitly required
- Service accounts have minimal permissions

### 2. Defense in Depth
- RLS at database level
- Application-level authorization
- API rate limiting
- Input validation

### 3. Audit and Monitoring
- Log all admin actions
- Monitor RLS policy violations
- Regular security reviews

### 4. Testing
- Unit tests for each RLS policy
- Integration tests for user flows
- Security penetration testing

## Performance Considerations

### 1. Policy Optimization
- Use indexes on columns used in policies
- Avoid complex subqueries in policies
- Test policy performance with large datasets

### 2. Connection Pooling
- RLS context is per-connection
- Use connection pooling efficiently
- Monitor connection usage

### 3. Caching
- Cache user context when possible
- Invalidate cache on permission changes
- Use Redis for session storage

## Monitoring and Maintenance

### 1. Log Analysis
```sql
-- Monitor RLS policy violations
SELECT * FROM pg_stat_user_tables WHERE n_tup_ins = 0 AND n_tup_upd = 0;
```

### 2. Performance Monitoring
```sql
-- Check policy execution time
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats 
WHERE tablename IN ('users', 'jobs', 'payments');
```

### 3. Regular Audits
- Review RLS policies quarterly
- Test with different user scenarios
- Update policies as features change

## Migration Checklist

- [ ] Apply RLS migration to database
- [ ] Update authentication middleware
- [ ] Add RLS context to all routes
- [ ] Test user data isolation
- [ ] Test admin functionality
- [ ] Update service layer methods
- [ ] Add monitoring and logging
- [ ] Document policy changes
- [ ] Train team on RLS concepts
- [ ] Plan rollback strategy

## Rollback Plan

If issues arise, you can disable RLS temporarily:

```sql
-- Disable RLS on specific table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Re-enable when ready
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

## Support and Resources

- PostgreSQL RLS Documentation: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Supabase RLS Guide: https://supabase.com/docs/guides/auth/row-level-security
- Security Best Practices: Internal security documentation

---

**⚠️ Important**: Test thoroughly in development before applying to production. RLS changes can break existing functionality if not implemented correctly.

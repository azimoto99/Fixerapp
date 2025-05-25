import { storage } from './storage';
import { auditService } from './audit-service';

// Advanced Role-Based Access Control for Plan Bravo Implementation
export interface UserRole {
  id: string;
  name: string;
  level: number;
  permissions: string[];
  description: string;
}

export interface RoleAssignment {
  userId: number;
  roleId: string;
  assignedBy: number;
  assignedAt: Date;
  expiresAt?: Date;
}

export class RoleManager {
  private static instance: RoleManager;
  private roles: Map<string, UserRole> = new Map();
  private userRoles: Map<number, RoleAssignment[]> = new Map();

  public static getInstance(): RoleManager {
    if (!RoleManager.instance) {
      RoleManager.instance = new RoleManager();
      RoleManager.instance.initializeDefaultRoles();
    }
    return RoleManager.instance;
  }

  // Initialize Plan Bravo role hierarchy
  private initializeDefaultRoles(): void {
    const defaultRoles: UserRole[] = [
      {
        id: 'basic_user',
        name: 'Basic User',
        level: 0,
        permissions: ['view_own_profile', 'create_jobs', 'apply_jobs'],
        description: 'Standard platform user with basic permissions'
      },
      {
        id: 'support_agent',
        name: 'Support Agent',
        level: 1,
        permissions: [
          'view_own_profile', 'create_jobs', 'apply_jobs',
          'view_support_tickets', 'respond_tickets', 'escalate_tickets',
          'view_basic_user_data'
        ],
        description: 'Customer support team member'
      },
      {
        id: 'moderator',
        name: 'Platform Moderator',
        level: 2,
        permissions: [
          'view_own_profile', 'create_jobs', 'apply_jobs',
          'view_support_tickets', 'respond_tickets', 'escalate_tickets',
          'view_basic_user_data', 'suspend_users', 'moderate_content',
          'view_job_reports', 'resolve_disputes'
        ],
        description: 'Content and user moderation specialist'
      },
      {
        id: 'financial_admin',
        name: 'Financial Administrator',
        level: 3,
        permissions: [
          'view_own_profile', 'create_jobs', 'apply_jobs',
          'view_support_tickets', 'respond_tickets', 'escalate_tickets',
          'view_basic_user_data', 'view_financial_data', 'process_refunds',
          'view_audit_trails', 'generate_reports', 'manage_payments'
        ],
        description: 'Financial operations and audit specialist'
      },
      {
        id: 'super_admin',
        name: 'Super Administrator',
        level: 4,
        permissions: [
          'view_own_profile', 'create_jobs', 'apply_jobs',
          'view_support_tickets', 'respond_tickets', 'escalate_tickets',
          'view_basic_user_data', 'suspend_users', 'moderate_content',
          'view_job_reports', 'resolve_disputes', 'view_financial_data',
          'process_refunds', 'view_audit_trails', 'generate_reports',
          'manage_payments', 'manage_users', 'manage_roles', 'system_config',
          'security_incidents', 'platform_analytics'
        ],
        description: 'Full administrative access to all platform features'
      }
    ];

    defaultRoles.forEach(role => {
      this.roles.set(role.id, role);
    });

    console.log('✓ Plan Bravo role hierarchy initialized with 5 role levels');
  }

  // Assign role to user
  async assignRole(params: {
    userId: number;
    roleId: string;
    assignedBy: number;
    expiresAt?: Date;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const role = this.roles.get(params.roleId);
      if (!role) {
        return { success: false, message: 'Role not found' };
      }

      const user = await storage.getUser(params.userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      const assigner = await storage.getUser(params.assignedBy);
      if (!assigner) {
        return { success: false, message: 'Assigner not found' };
      }

      // Check if assigner has permission to assign this role
      const canAssign = await this.canUserAssignRole(params.assignedBy, params.roleId);
      if (!canAssign) {
        return { success: false, message: 'Insufficient permissions to assign this role' };
      }

      const assignment: RoleAssignment = {
        userId: params.userId,
        roleId: params.roleId,
        assignedBy: params.assignedBy,
        assignedAt: new Date(),
        expiresAt: params.expiresAt
      };

      // Get or create user role assignments
      const userAssignments = this.userRoles.get(params.userId) || [];
      
      // Remove any existing assignment for this role
      const filtered = userAssignments.filter(a => a.roleId !== params.roleId);
      filtered.push(assignment);
      
      this.userRoles.set(params.userId, filtered);

      // Update user's admin status for basic compatibility
      if (role.level >= 2) {
        await storage.updateUser(params.userId, { isAdmin: true });
      }

      // Log role assignment in audit trail
      await auditService.logFinancialTransaction({
        userId: params.assignedBy,
        action: 'role_assigned',
        entityType: 'user',
        entityId: params.userId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: {
          roleId: params.roleId,
          roleName: role.name,
          roleLevel: role.level,
          assignedTo: user.username,
          expiresAt: params.expiresAt?.toISOString()
        }
      });

      console.log(`✓ Role ${role.name} assigned to user ${user.username} by ${assigner.username}`);
      return { success: true, message: `Role ${role.name} assigned successfully` };

    } catch (error) {
      console.error('Error assigning role:', error);
      return { success: false, message: 'Failed to assign role' };
    }
  }

  // Check if user can assign a specific role
  private async canUserAssignRole(assignerId: number, targetRoleId: string): Promise<boolean> {
    const assignerRoles = await this.getUserRoles(assignerId);
    const targetRole = this.roles.get(targetRoleId);
    
    if (!targetRole) return false;

    // Super admins can assign any role
    if (assignerRoles.some(r => r.id === 'super_admin')) {
      return true;
    }

    // Financial admins can assign up to moderator level
    if (assignerRoles.some(r => r.id === 'financial_admin') && targetRole.level <= 2) {
      return true;
    }

    // Moderators can assign support agent roles
    if (assignerRoles.some(r => r.id === 'moderator') && targetRole.level <= 1) {
      return true;
    }

    return false;
  }

  // Get user's current roles
  async getUserRoles(userId: number): Promise<UserRole[]> {
    const assignments = this.userRoles.get(userId) || [];
    const activeRoles: UserRole[] = [];

    for (const assignment of assignments) {
      // Check if role is expired
      if (assignment.expiresAt && assignment.expiresAt < new Date()) {
        continue;
      }

      const role = this.roles.get(assignment.roleId);
      if (role) {
        activeRoles.push(role);
      }
    }

    return activeRoles;
  }

  // Check if user has specific permission
  async userHasPermission(userId: number, permission: string): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId);
    
    return userRoles.some(role => 
      role.permissions.includes(permission) ||
      role.permissions.includes('*') // Wildcard permission
    );
  }

  // Get user's highest role level
  async getUserMaxRoleLevel(userId: number): Promise<number> {
    const userRoles = await this.getUserRoles(userId);
    return Math.max(...userRoles.map(r => r.level), 0);
  }

  // Remove role from user
  async removeRole(params: {
    userId: number;
    roleId: string;
    removedBy: number;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const assignments = this.userRoles.get(params.userId) || [];
      const filtered = assignments.filter(a => a.roleId !== params.roleId);
      
      if (filtered.length === assignments.length) {
        return { success: false, message: 'User does not have this role' };
      }

      this.userRoles.set(params.userId, filtered);

      // Update user's admin status if no admin roles remain
      const remainingRoles = await this.getUserRoles(params.userId);
      const hasAdminRole = remainingRoles.some(r => r.level >= 2);
      
      if (!hasAdminRole) {
        await storage.updateUser(params.userId, { isAdmin: false });
      }

      // Log role removal in audit trail
      const role = this.roles.get(params.roleId);
      await auditService.logFinancialTransaction({
        userId: params.removedBy,
        action: 'role_removed',
        entityType: 'user',
        entityId: params.userId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: {
          roleId: params.roleId,
          roleName: role?.name,
          reason: params.reason
        }
      });

      console.log(`✓ Role ${role?.name} removed from user ${params.userId}`);
      return { success: true, message: 'Role removed successfully' };

    } catch (error) {
      console.error('Error removing role:', error);
      return { success: false, message: 'Failed to remove role' };
    }
  }

  // Get all available roles
  getAllRoles(): UserRole[] {
    return Array.from(this.roles.values()).sort((a, b) => a.level - b.level);
  }

  // Get role statistics for admin dashboard
  async getRoleStatistics(): Promise<{
    totalRoles: number;
    usersByRole: Record<string, number>;
    roleHierarchy: UserRole[];
  }> {
    const totalRoles = this.roles.size;
    const usersByRole: Record<string, number> = {};

    // Count users by role
    for (const [userId, assignments] of this.userRoles.entries()) {
      for (const assignment of assignments) {
        if (!assignment.expiresAt || assignment.expiresAt > new Date()) {
          usersByRole[assignment.roleId] = (usersByRole[assignment.roleId] || 0) + 1;
        }
      }
    }

    return {
      totalRoles,
      usersByRole,
      roleHierarchy: this.getAllRoles()
    };
  }

  // Middleware for role-based route protection
  requireRole(requiredRole: string) {
    return async (req: any, res: any, next: any) => {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const hasRole = await this.userHasRole(req.user.id, requiredRole);
      if (!hasRole) {
        await auditService.logFinancialTransaction({
          userId: req.user.id,
          action: 'access_denied_insufficient_role',
          entityType: 'user',
          entityId: req.user.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          metadata: {
            requiredRole,
            attemptedPath: req.path
          }
        });

        return res.status(403).json({ message: 'Insufficient role permissions' });
      }

      next();
    };
  }

  // Check if user has specific role
  private async userHasRole(userId: number, roleId: string): Promise<boolean> {
    const assignments = this.userRoles.get(userId) || [];
    return assignments.some(a => 
      a.roleId === roleId && 
      (!a.expiresAt || a.expiresAt > new Date())
    );
  }

  // Middleware for permission-based route protection
  requirePermission(permission: string) {
    return async (req: any, res: any, next: any) => {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const hasPermission = await this.userHasPermission(req.user.id, permission);
      if (!hasPermission) {
        await auditService.logFinancialTransaction({
          userId: req.user.id,
          action: 'access_denied_insufficient_permission',
          entityType: 'user',
          entityId: req.user.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          metadata: {
            requiredPermission: permission,
            attemptedPath: req.path
          }
        });

        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      next();
    };
  }
}

export const roleManager = RoleManager.getInstance();
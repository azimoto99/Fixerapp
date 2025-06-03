import { Router } from 'express';
import { systemMonitor } from '../system-monitor';
import { checkSessionHealth } from '../api/session-health';
import { enhancedAdminAuth, auditAdminAction } from '../admin-security';

const router = Router();
const adminAuth = enhancedAdminAuth('admin');

// Session health monitoring
router.get("/sessions/health", 
  adminAuth,
  auditAdminAction('check_session_health', 'system'),
  async (req, res) => {
    try {
      const health = await checkSessionHealth(req);
      res.json(health);
    } catch (error) {
      console.error('Session health check error:', error);
      res.status(500).json({ message: "Failed to check session health" });
    }
});

// Session statistics 
router.get("/sessions/stats",
  adminAuth,
  auditAdminAction('view_session_stats', 'system'),
  async (req, res) => {
    try {
      const [healthCheck, metrics] = await Promise.all([
        systemMonitor.performHealthCheck(),
        systemMonitor.getSystemHealth()
      ]);

      res.json({
        activeConnections: metrics.activeConnections,
        systemStatus: healthCheck.status,
        services: healthCheck.services,
        summary: healthCheck.summary
      });
    } catch (error) {
      console.error('Session stats error:', error);
      res.status(500).json({ message: "Failed to fetch session statistics" });
    }
});

// System health monitoring
router.get("/system/health", 
  adminAuth,
  auditAdminAction('view_system_health', 'system'),
  async (req, res) => {
    try {
      const systemHealth = await systemMonitor.getSystemHealth();
      res.json(systemHealth);
    } catch (error) {
      console.error('System health check error:', error);
      res.status(500).json({ message: "Failed to fetch system health" });
    }
});

// Comprehensive health check (for external monitoring)
router.get("/system/health-check",
  adminAuth,
  auditAdminAction('perform_health_check', 'system'),
  async (req, res) => {
    try {
      const healthCheck = await systemMonitor.performHealthCheck();
      res.json(healthCheck);
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({ message: "Failed to perform health check" });
    }
});

export default router;

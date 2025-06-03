import { ServiceHealth } from '../system-monitor';

export interface SessionHealth {
  isAuthenticated: boolean;
  sessionId?: string;
  userId?: number;
  hasCookie: boolean;
  cookieMaxAge?: number;
  cookieExpired: boolean;
  userActive?: boolean;
  lastActivity?: Date;
  sessionStarted?: Date;
}

export interface SessionStats {
  activeConnections: number;
  systemStatus: 'healthy' | 'degraded' | 'down';
  services: Record<string, ServiceHealth>;
  summary: string;
}

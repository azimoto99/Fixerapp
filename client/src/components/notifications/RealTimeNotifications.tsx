import React, { useEffect, useState } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  Zap, 
  Bell, 
  User,
  Briefcase,
  DollarSign,
  Clock
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  data?: any;
  read?: boolean;
}

interface RealTimeNotificationsProps {
  className?: string;
}

export function RealTimeNotifications({ className = '' }: RealTimeNotificationsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Listen for WebSocket messages
  useEffect(() => {
    const handleWebSocketMessage = (message: any) => {
      if (!user) return;

      switch (message.type) {
        case 'instant_application_received':
          if (user.id === message.posterId) {
            const notification: NotificationData = {
              id: `app_${message.applicationId}_${Date.now()}`,
              type: 'instant_application',
              title: '⚡ New Instant Application!',
              message: `${message.workerName} just applied for your job!`,
              timestamp: message.timestamp,
              data: {
                jobId: message.jobId,
                workerId: message.workerId,
                applicationId: message.applicationId
              }
            };

            setNotifications(prev => [notification, ...prev.slice(0, 9)]);
            
            // Show toast with sound effect
            toast({
              title: notification.title,
              description: notification.message,
            });

            // Play notification sound (if available)
            playNotificationSound('application');

            // Refresh applications data
            queryClient.invalidateQueries({ queryKey: [`/api/applications/job/${message.jobId}`] });
          }
          break;

        case 'application_accepted_notification':
          if (user.id === message.workerId) {
            const notification: NotificationData = {
              id: `accepted_${message.applicationId}_${Date.now()}`,
              type: 'application_accepted',
              title: '🎉 Application Accepted!',
              message: 'Congratulations! Your application has been accepted.',
              timestamp: message.timestamp,
              data: {
                jobId: message.jobId,
                applicationId: message.applicationId
              }
            };

            setNotifications(prev => [notification, ...prev.slice(0, 9)]);
            
            toast({
              title: notification.title,
              description: notification.message,
            });

            playNotificationSound('success');

            // Refresh job and application data
            queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
            queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
          }
          break;

        case 'application_rejected_notification':
          if (user.id === message.workerId) {
            const notification: NotificationData = {
              id: `rejected_${message.applicationId}_${Date.now()}`,
              type: 'application_rejected',
              title: 'Application Update',
              message: 'Your application was not selected this time.',
              timestamp: message.timestamp,
              data: {
                jobId: message.jobId,
                applicationId: message.applicationId
              }
            };

            setNotifications(prev => [notification, ...prev.slice(0, 9)]);
            
            toast({
              title: notification.title,
              description: notification.message,
              variant: 'default',
            });

            // Refresh application data
            queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
          }
          break;

        case 'job_assigned':
          // Show notification to all relevant users
          const assignedNotification: NotificationData = {
            id: `assigned_${message.jobId}_${Date.now()}`,
            type: 'job_assigned',
            title: '📋 Job Assigned',
            message: 'A job has been assigned and is ready to start!',
            timestamp: message.timestamp,
            data: {
              jobId: message.jobId,
              workerId: message.workerId,
              applicationId: message.applicationId
            }
          };

          setNotifications(prev => [assignedNotification, ...prev.slice(0, 9)]);
          
          // Refresh job data
          queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
          break;

        default:
          // Handle other notification types
          break;
      }
    };

    // This would be connected to the WebSocket context
    // For now, we'll simulate it
    return () => {
      // Cleanup
    };
  }, [user, toast, queryClient]);

  const playNotificationSound = (type: 'application' | 'success' | 'info') => {
    try {
      // Create audio context for notification sounds
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Different frequencies for different notification types
      const frequencies = {
        application: [800, 1000, 1200], // Rising tone
        success: [600, 800, 1000, 1200], // Success chime
        info: [800] // Simple beep
      };

      const freq = frequencies[type];
      
      freq.forEach((frequency, index) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.2);
        }, index * 100);
      });
    } catch (error) {
      // Fallback: no sound if audio context fails
      console.log('Audio notification not available');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'instant_application':
        return <Zap className="h-5 w-5 text-blue-500" />;
      case 'application_accepted':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'application_rejected':
        return <XCircle className="h-5 w-5 text-orange-500" />;
      case 'job_assigned':
        return <Briefcase className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'instant_application':
        return 'border-blue-200 bg-blue-50';
      case 'application_accepted':
        return 'border-green-200 bg-green-50';
      case 'application_rejected':
        return 'border-orange-200 bg-orange-50';
      case 'job_assigned':
        return 'border-purple-200 bg-purple-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    );
  };

  const clearNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => setShowNotifications(!showNotifications)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </Button>

      {/* Notifications Dropdown */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-50"
          >
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Notifications</h3>
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNotifications([])}
                    className="text-xs"
                  >
                    Clear all
                  </Button>
                )}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No new notifications</p>
                </div>
              ) : (
                <AnimatePresence>
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notification.timestamp).toLocaleTimeString()}
                          </p>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearNotification(notification.id);
                          }}
                          className="flex-shrink-0 h-6 w-6 p-0"
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

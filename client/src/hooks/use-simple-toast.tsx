import * as React from 'react';
import { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import SimpleToast from '@/components/SimpleToast';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  position?: 'top' | 'bottom';
}

interface ToastContextProps {
  showToast: (message: string, type?: ToastType, options?: { duration?: number; position?: 'top' | 'bottom' }) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const SimpleToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', options?: { duration?: number; position?: 'top' | 'bottom' }) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prevToasts => [...prevToasts, { 
      id, 
      message, 
      type,
      duration: options?.duration,
      position: options?.position 
    }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map(toast => (
        <SimpleToast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          position={toast.position}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </ToastContext.Provider>
  );
};

export const useSimpleToast = (): ToastContextProps => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useSimpleToast must be used within a SimpleToastProvider');
  }
  return context;
};
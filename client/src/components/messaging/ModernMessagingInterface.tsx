import React from 'react';

export interface ModernMessagingInterfaceProps {
  className?: string;
  [key: string]: any;
}

export function ModernMessagingInterface({ className }: ModernMessagingInterfaceProps) {
  return (
    <div
      className={
        className ? `${className} flex items-center justify-center text-muted-foreground` :
        'flex items-center justify-center text-muted-foreground'
      }
    >
      <p className="text-sm italic">Messaging is currently disabled.</p>
    </div>
  );
}

export default ModernMessagingInterface;

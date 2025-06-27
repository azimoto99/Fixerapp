import React, { ReactNode } from 'react';

interface LoadScriptProps {
  src?: string;
  strategy?: string;
  children: ReactNode;
}

// Simple wrapper component - since we're not using Google Maps, this just renders children
export function LoadScript({ children }: LoadScriptProps) {
  return <>{children}</>;
}

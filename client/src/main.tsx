import React from "@/lib/ensure-react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./components/ui/dialog-fix.css";
import { Toaster } from "@/components/ui/toaster";

console.log('main.tsx loading...');
console.log('Environment variables:', {
  VITE_STRIPE_PUBLIC_KEY: import.meta.env.VITE_STRIPE_PUBLIC_KEY ? 'Set' : 'Not set',
  VITE_MAPBOX_ACCESS_TOKEN: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ? 'Set' : 'Not set',
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD
});

// Simple error boundary
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error?: Error}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('React Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
          <h1>Application Error</h1>
          <pre style={{ color: 'red' }}>{this.state.error?.toString()}</pre>
          <p>Check the browser console for more details</p>
          <p>Common issues:</p>
          <ul>
            <li>Missing VITE_STRIPE_PUBLIC_KEY in .env file</li>
            <li>Missing VITE_MAPBOX_ACCESS_TOKEN in .env file</li>
          </ul>
        </div>
      );
    }

    return this.props.children;
  }
}

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
  
  console.log('App rendered successfully');
} catch (error) {
  console.error('Failed to render app:', error);
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: monospace;">
      <h1>Failed to start application</h1>
      <pre style="color: red;">${error}</pre>
      <p>Check the browser console for more details</p>
    </div>
  `;
}

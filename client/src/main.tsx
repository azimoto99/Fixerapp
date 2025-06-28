import React from "@/lib/ensure-react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./components/ui/dialog-fix.css";
import { Toaster } from "@/components/ui/toaster";

// Environment check for development
if (import.meta.env.DEV) {
  console.log('Development mode - Environment variables loaded');
}

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
  
  // Safely create error display without innerHTML injection
  const container = document.createElement('div');
  container.style.cssText = 'padding: 20px; font-family: monospace;';
  
  const title = document.createElement('h1');
  title.textContent = 'Failed to start application';
  
  const errorPre = document.createElement('pre');
  errorPre.style.color = 'red';
  errorPre.textContent = String(error); // Safely convert error to string
  
  const message = document.createElement('p');
  message.textContent = 'Check the browser console for more details';
  
  container.appendChild(title);
  container.appendChild(errorPre);
  container.appendChild(message);
  
  document.body.innerHTML = ''; // Clear existing content
  document.body.appendChild(container);
}

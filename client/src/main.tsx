import { createRoot } from "react-dom/client";
import React, { useState, useEffect } from "react";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";

// Error boundary component
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Add global error handler
    const errorHandler = (event: ErrorEvent) => {
      console.error("Global error caught:", event.error);
      setHasError(true);
      setError(event.error);
      event.preventDefault();
    };

    // Add promise rejection handler
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      setHasError(true);
      setError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
      event.preventDefault();
    };

    window.addEventListener("error", errorHandler);
    window.addEventListener("unhandledrejection", rejectionHandler);

    return () => {
      window.removeEventListener("error", errorHandler);
      window.removeEventListener("unhandledrejection", rejectionHandler);
    };
  }, []);

  if (hasError) {
    return (
      <div style={{ 
        padding: "20px", 
        margin: "20px", 
        backgroundColor: "#f8d7da", 
        color: "#721c24",
        borderRadius: "5px", 
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <h1 style={{ margin: "0 0 20px 0" }}>Something went wrong</h1>
        <p>There was an error in the application. Please try refreshing the page.</p>
        <details style={{ 
          marginTop: "20px", 
          padding: "10px", 
          backgroundColor: "rgba(0,0,0,0.05)",
          borderRadius: "3px"
        }}>
          <summary>Error details (for developers)</summary>
          <pre style={{ 
            overflow: "auto", 
            padding: "10px", 
            backgroundColor: "#f8f9fa",
            borderRadius: "3px"
          }}>
            {error ? error.toString() : "Unknown error"}
            {error && error.stack ? `\n\nStack trace:\n${error.stack}` : ""}
          </pre>
        </details>
        <button 
          onClick={() => window.location.reload()} 
          style={{
            marginTop: "20px",
            padding: "8px 16px",
            background: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

// Add debug info to the console
console.log("App mounting, React version:", React.version);

try {
  const root = createRoot(document.getElementById("root")!);
  root.render(
    <ErrorBoundary>
      <App />
      <Toaster />
    </ErrorBoundary>
  );
} catch (e) {
  console.error("Error rendering React app:", e);
  document.getElementById("root")!.innerHTML = `
    <div style="padding: 20px; margin: 20px; background-color: #f8d7da; color: #721c24; border-radius: 5px;">
      <h1>Failed to load application</h1>
      <p>There was a critical error initializing the application. Please check the console for details.</p>
      <pre style="overflow: auto; padding: 10px; background-color: #f8f9fa; border-radius: 3px;">${e}</pre>
    </div>
  `;
}

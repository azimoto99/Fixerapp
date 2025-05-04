import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Switch, Route } from "wouter";
import NotFound from "@/pages/not-found";
import { Button } from "@/components/ui/button";

// Simplified app for debugging
function DiagnosticPage() {
  const [serverStatus, setServerStatus] = useState<string>("Checking...");
  const [authStatus, setAuthStatus] = useState<string>("Checking...");
  
  useEffect(() => {
    // Check server status
    fetch("/api/categories")
      .then(response => {
        if (response.ok) {
          setServerStatus("Server is running ✅");
        } else {
          setServerStatus(`Server error: ${response.status} ${response.statusText} ❌`);
        }
      })
      .catch(error => {
        setServerStatus(`Server connection error: ${error.message} ❌`);
      });
    
    // Check auth status
    fetch("/api/user")
      .then(response => {
        if (response.ok) {
          return response.json().then(user => {
            setAuthStatus(`Authenticated as ${user.username} ✅`);
          });
        } else if (response.status === 401) {
          setAuthStatus("Not authenticated ℹ️");
        } else {
          setAuthStatus(`Auth error: ${response.status} ${response.statusText} ❌`);
        }
      })
      .catch(error => {
        setAuthStatus(`Auth check error: ${error.message} ❌`);
      });
  }, []);
  
  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold mb-4">The Job - System Diagnostic</h1>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">System Status</h2>
          <div className="space-y-2 mb-4">
            <div className="p-3 bg-gray-100 rounded">
              <p><strong>Server Status:</strong> {serverStatus}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded">
              <p><strong>Auth Status:</strong> {authStatus}</p>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Authentication Tests</h2>
          <div className="flex flex-wrap gap-4">
            <a href="/auth-test">
              <Button variant="outline">Google Auth Test</Button>
            </a>
            <a href="/register-test">
              <Button variant="outline">Registration Test</Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simplified router for diagnostic purposes
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Switch>
          <Route path="/" component={DiagnosticPage} />
          <Route component={NotFound} />
        </Switch>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

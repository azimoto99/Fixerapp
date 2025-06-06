import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, Bug, Network, Check } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const StripeDebugPage = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [endpoints, setEndpoints] = useState<{path: string, status: 'pending' | 'success' | 'error', response?: any}[]>([
    { path: '/api/health', status: 'pending' },
    { path: '/api/stripe/connect/health', status: 'pending' },
    { path: '/api/stripe/connect', status: 'pending' },
  ]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [message, ...prev]);
  };

  const testEndpoint = async (path: string, index: number) => {
    addLog(`Testing endpoint: ${path}`);
    
    try {
      const response = await fetch(path, {
        method: path.includes('create-account') ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      const status = response.ok ? 'success' : 'error';
      let responseData: any = null;
      
      try {
        responseData = await response.json();
      } catch (e) {
        responseData = { text: await response.text() };
      }
      
      setEndpoints(prev => {
        const updated = [...prev];
        updated[index] = { 
          ...updated[index], 
          status, 
          response: {
            status: response.status,
            statusText: response.statusText,
            data: responseData
          }
        };
        return updated;
      });
      
      addLog(`${path}: ${response.status} ${response.statusText}`);
      addLog(`Response: ${JSON.stringify(responseData)}`);
    } catch (error) {
      setEndpoints(prev => {
        const updated = [...prev];
        updated[index] = { 
          ...updated[index], 
          status: 'error', 
          response: {
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        };
        return updated;
      });
      
      addLog(`Error testing ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    addLog('Starting endpoint tests...');
    
    // Reset statuses
    setEndpoints(prev => prev.map(ep => ({ ...ep, status: 'pending' })));
    
    // Test endpoints one by one
    for (let i = 0; i < endpoints.length; i++) {
      await testEndpoint(endpoints[i].path, i);
    }
    
    setLoading(false);
    addLog('All tests completed');
  };

  // Add create-account test
  const testCreateAccount = async () => {
    setLoading(true);
    addLog('Testing create-account endpoint...');
    
    try {
      const response = await fetch('/api/stripe/connect/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({})
      });
      
      const status = response.ok ? 'success' : 'error';
      let responseData: any = null;
      
      try {
        responseData = await response.json();
      } catch (e) {
        responseData = { text: await response.text() };
      }
      
      addLog(`create-account: ${response.status} ${response.statusText}`);
      addLog(`Response: ${JSON.stringify(responseData)}`);
      
      if (responseData.accountLinkUrl) {
        addLog(`Account link URL found, opening in new tab...`);
        window.open(responseData.accountLinkUrl, '_blank');
      }
    } catch (error) {
      addLog(`Error testing create-account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    addLog('Stripe Debug Page initialized');
  }, []);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Bug className="h-6 w-6" /> Stripe Connect Debug Panel
      </h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" /> API Endpoint Tests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={runAllTests} 
                disabled={loading}
                variant="default"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Test All Endpoints
              </Button>
              <Button 
                onClick={testCreateAccount} 
                disabled={loading}
                variant="secondary"
              >
                Test Create Account
              </Button>
            </div>
            
            <div className="space-y-2">
              {endpoints.map((endpoint, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                  <div className="font-mono text-sm">{endpoint.path}</div>
                  <div className="flex items-center">
                    {endpoint.status === 'pending' ? (
                      <span className="text-gray-500">Pending</span>
                    ) : endpoint.status === 'success' ? (
                      <span className="text-green-500 flex items-center">
                        Success <Check className="h-4 w-4 ml-1" />
                      </span>
                    ) : (
                      <span className="text-red-500">Error</span>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="ml-2" 
                      onClick={() => testEndpoint(endpoint.path, index)}
                    >
                      Test
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <Alert variant="warning" className="mt-4">
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Make sure you are logged in before testing the Stripe Connect endpoints.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Debug Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-md max-h-[400px] overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <div className="text-gray-500 italic">No logs yet. Run tests to see results.</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="py-1 border-b border-dashed border-slate-200 dark:border-slate-800">
                    {log}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StripeDebugPage;

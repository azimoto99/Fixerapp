import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const DirectConnect: React.FC = () => {
  const [url, setUrl] = useState('');
  const [expoUrl, setExpoUrl] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Get the current window location
    const currentUrl = window.location.href;
    setUrl(currentUrl);
    
    // Get the base URL (without path)
    const baseUrl = window.location.origin;
    
    // Create the Expo URL by replacing https:// with exp://
    const expo = baseUrl.replace('https://', 'exp://');
    setExpoUrl(expo);
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(expoUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-3 text-sm text-center z-50 flex items-center justify-center gap-3">
        <span className="hidden sm:inline">Connect to your phone:</span>
        <code className="bg-gray-800 px-2 py-1 rounded">{expoUrl}</code>
        <Button 
          size="sm" 
          className="bg-green-500 hover:bg-green-600 text-white px-3"
          onClick={copyToClipboard}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </Button>
        <Button 
          size="sm"
          variant="outline"

          className="text-white border-white hover:bg-gray-800"
          onClick={() => setShowGuide(!showGuide)}
        >
          Help
        </Button>
      </div>

      {showGuide && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-white dark:bg-gray-900 p-6 max-w-md w-full rounded-lg shadow-xl">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <span className="text-green-500 text-2xl mr-2">📱</span> Connect to Expo Go
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-1">Step 1: Install Expo Go</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Download the Expo Go app from your app store (iOS or Android).
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-1">Step 2: Enter the URL</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  In Expo Go, tap "Enter URL manually" and enter:
                </p>
                <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded font-mono text-sm">
                  {expoUrl}
                </div>
              </div>
              
              <div className="pt-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  If you encounter issues, try using mobile data instead of WiFi, or restart the Expo Go app.
                </p>
              </div>
              
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setShowGuide(false)}>
                  Close
                </Button>
                <Button 
                  className="bg-green-500 hover:bg-green-600" 
                  onClick={copyToClipboard}
                >
                  {copied ? '✓ Copied' : 'Copy URL'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};

export default DirectConnect;
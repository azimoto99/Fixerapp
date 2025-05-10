import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSimpleToast } from '@/hooks/use-simple-toast';

export default function ExpoConnectGuide() {
  const { showToast } = useSimpleToast();
  const [showGuide, setShowGuide] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [expoUrl, setExpoUrl] = useState('');

  useEffect(() => {
    // Get the current URL and transform it to Expo format
    const url = window.location.href;
    setCurrentUrl(url);
    setExpoUrl(url.replace('https://', 'exp://'));
  }, []);

  if (!showGuide) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setShowGuide(true)}
          className="bg-green-500 hover:bg-green-600 text-white shadow-lg"
        >
          📱 Connect to Phone
        </Button>
      </div>
    );
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      function() {
        showToast('URL copied to clipboard');
      },
      function() {
        showToast('Could not copy text');
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
              <span className="text-green-500 text-xl">🔧</span>
            </div>
            <span>Connect to Expo Go</span>
          </CardTitle>
          <CardDescription>
            Follow these steps to run Fixer on your phone
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="steps">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="steps">Step by Step</TabsTrigger>
              <TabsTrigger value="urls">Quick Connect</TabsTrigger>
            </TabsList>
            <TabsContent value="steps" className="space-y-4 mt-4">
              <ol className="space-y-3">
                <li className="flex gap-2">
                  <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">1</span>
                  <div>Install <a href="https://expo.dev/client" target="_blank" rel="noopener noreferrer" className="text-green-500 underline">Expo Go</a> app on your phone</div>
                </li>
                <li className="flex gap-2">
                  <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">2</span>
                  <div>Open Expo Go and select "Enter URL manually"</div>
                </li>
                <li className="flex gap-2">
                  <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">3</span>
                  <div>Enter the Expo URL (tap below to copy):</div>
                </li>
              </ol>
              <div 
                className="bg-gray-100 p-2 rounded font-mono text-sm break-all cursor-pointer"
                onClick={() => copyToClipboard(expoUrl)}
              >
                {expoUrl}
              </div>
              <p className="text-xs text-gray-500">Tap the URL above to copy it to clipboard</p>
            </TabsContent>
            <TabsContent value="urls" className="mt-4">
              <div className="space-y-4">
                <p className="text-sm">Current URL:</p>
                <div 
                  className="bg-gray-100 p-2 rounded font-mono text-sm break-all cursor-pointer"
                  onClick={() => copyToClipboard(currentUrl)}
                >
                  {currentUrl}
                </div>
                <p className="text-sm font-medium mt-4">Expo URL (use this in Expo Go app):</p>
                <div 
                  className="bg-gray-100 p-2 rounded font-mono text-sm break-all cursor-pointer"
                  onClick={() => copyToClipboard(expoUrl)}
                >
                  {expoUrl}
                </div>
                <p className="text-xs text-gray-500">Tap either URL to copy to clipboard</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setShowGuide(false)}>
            Close
          </Button>
          <Button className="bg-green-500 hover:bg-green-600" onClick={() => window.open('https://expo.dev/client', '_blank')}>
            Get Expo Go
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
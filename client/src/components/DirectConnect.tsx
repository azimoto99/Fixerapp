import React, { useEffect, useState } from 'react';

const DirectConnect: React.FC = () => {
  const [url, setUrl] = useState('');
  const [expoUrl, setExpoUrl] = useState('');

  useEffect(() => {
    // Get the current window location
    const currentUrl = window.location.href;
    setUrl(currentUrl);
    
    // Create the Expo URL by replacing https:// with exp://
    const expo = currentUrl.replace('https://', 'exp://');
    setExpoUrl(expo);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 text-sm text-center">
      <a href={expoUrl} className="text-green-400 hover:underline">
        Open in Expo Go: {expoUrl}
      </a>
    </div>
  );
};

export default DirectConnect;
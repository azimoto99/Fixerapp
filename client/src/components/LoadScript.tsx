import React, { useEffect, useState } from 'react';

interface LoadScriptProps {
  src: string;
  strategy?: 'afterInteractive' | 'lazyOnload' | 'idle';
  children: React.ReactNode;
}

export const LoadScript: React.FC<LoadScriptProps> = ({ src, strategy = 'afterInteractive', children }) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (document.querySelector(`script[src="${src}"]`)) {
      setLoaded(true);
      return;
    }

    const loadScript = () => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => setLoaded(true);
      document.body.appendChild(script);
    };

    if (strategy === 'afterInteractive') {
      loadScript();
    } else if (strategy === 'lazyOnload') {
      window.addEventListener('load', loadScript);
    } else if (strategy === 'idle') {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(loadScript);
      } else {
        setTimeout(loadScript, 500);
      }
    }

    return () => {
      window.removeEventListener('load', loadScript);
    };
  }, [src, strategy]);

  return loaded ? <>{children}</> : null;
};

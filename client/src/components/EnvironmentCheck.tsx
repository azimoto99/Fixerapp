export function EnvironmentCheck() {
  const vars = {
    VITE_STRIPE_PUBLIC_KEY: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
    VITE_MAPBOX_ACCESS_TOKEN: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
    MODE: import.meta.env.MODE,
    BASE_URL: import.meta.env.BASE_URL,
    PROD: import.meta.env.PROD,
    DEV: import.meta.env.DEV,
  };
  
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Environment Check</h2>
      <pre>{JSON.stringify(vars, null, 2)}</pre>
      <p>If VITE_STRIPE_PUBLIC_KEY or VITE_MAPBOX_ACCESS_TOKEN are undefined, check your .env file</p>
    </div>
  );
} 
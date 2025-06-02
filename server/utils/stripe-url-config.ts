export interface StripeURLConfig {
  baseURL: string;
  refreshPath: string;
  returnPath: string;
}

export function getStripeURLs(req: any, config: Partial<StripeURLConfig> = {}): StripeURLConfig {
  const defaults: StripeURLConfig = {
    baseURL: process.env.APP_URL || '',
    refreshPath: '/stripe-connect-refresh',
    returnPath: '/stripe-connect-return',
  };

  const baseURL = req.headers.origin || defaults.baseURL;
  if (!baseURL) {
    throw new Error('APP_URL environment variable or Origin header must be set');
  }

  const finalConfig = { ...defaults, ...config, baseURL };

  return {
    baseURL: finalConfig.baseURL,
    refreshPath: finalConfig.refreshPath,
    returnPath: finalConfig.returnPath,
  };
}

export function getStripeConnectURLs(req: any): { refreshURL: string; returnURL: string } {
  const config = getStripeURLs(req);
  return {
    refreshURL: `${config.baseURL}${config.refreshPath}`,
    returnURL: `${config.baseURL}${config.returnPath}`,
  };
}

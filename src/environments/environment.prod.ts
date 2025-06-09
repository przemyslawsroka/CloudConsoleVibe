export const environment = {
  production: true,
  googleClientId: (window as any)._env_?.CLIENT_ID || '733352132096-kpsaeb0ac7lu230kjug231hfl097qq8d.apps.googleusercontent.com',
  apiBaseUrl: (window as any)._env_?.API_BASE_URL || 'https://compute.googleapis.com/compute/v1',
  authDomain: (window as any)._env_?.AUTH_DOMAIN || 'accounts.google.com',
  logLevel: (window as any)._env_?.LOG_LEVEL || 'error',
  googleAnalyticsId: (window as any)._env_?.GA_TRACKING_ID || 'G-TCLR1BZ0N7',
  enableAnalytics: (window as any)._env_?.ENABLE_ANALYTICS === 'true'
}; 
export const environment = {
  production: true,
  googleClientId: (window as any)._env_?.GOOGLE_CLIENT_ID || process.env['GOOGLE_CLIENT_ID'] || '',
  apiBaseUrl: (window as any)._env_?.API_BASE_URL || process.env['API_BASE_URL'] || 'https://cloudconsolevibe-backend-6anbejtsta-uc.a.run.app',
  authDomain: (window as any)._env_?.AUTH_DOMAIN || process.env['AUTH_DOMAIN'] || 'accounts.google.com',
  logLevel: (window as any)._env_?.LOG_LEVEL || process.env['LOG_LEVEL'] || 'error',
  googleAnalyticsId: (window as any)._env_?.GOOGLE_ANALYTICS_ID || process.env['GOOGLE_ANALYTICS_ID'] || '',
  enableAnalytics: ((window as any)._env_?.ENABLE_ANALYTICS || process.env['ENABLE_ANALYTICS']) !== 'false',
  geminiApiKey: (window as any)._env_?.GEMINI_API_KEY || process.env['GEMINI_API_KEY'] || '',
  appneta: {
    apiBaseUrl: (window as any)._env_?.APPNETA_API_BASE_URL || process.env['APPNETA_API_BASE_URL'] || '',
    apiKey: (window as any)._env_?.APPNETA_API_KEY || process.env['APPNETA_API_KEY'] || '',
    demoMode: ((window as any)._env_?.APPNETA_DEMO_MODE || process.env['APPNETA_DEMO_MODE']) === 'true'
  }
}; 
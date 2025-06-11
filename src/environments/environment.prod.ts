export const environment = {
  production: true,
  googleClientId: (window as any)._env_?.CLIENT_ID || '733352132096-kpsaeb0ac7lu230kjug231hfl097qq8d.apps.googleusercontent.com',
  apiBaseUrl: 'https://cloudconsolevibe-backend-6anbejtsta-uc.a.run.app',
  authDomain: (window as any)._env_?.AUTH_DOMAIN || 'accounts.google.com',
  logLevel: (window as any)._env_?.LOG_LEVEL || 'error',
  googleAnalyticsId: 'G-TCLR1BZ0N7',
  enableAnalytics: true,
  geminiApiKey: 'AIzaSyBxxrS3p4jIR2ik0jL24rdV9j6PG6VTam4'
}; 
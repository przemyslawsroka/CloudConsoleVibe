// Production environment configuration
// DO NOT commit environment.prod.ts to git!

export const environment = {
  production: true,
  googleClientId: '733352132096-kpsaeb0ac7lu230kjug231hfl097qq8d.apps.googleusercontent.com',
  apiBaseUrl: 'https://cloudconsolevibe-backend-6anbejtsta-uc.a.run.app',
  authDomain: 'accounts.google.com',
  logLevel: 'info',
  googleAnalyticsId: 'G-TCLR1BZ0N7',
  enableAnalytics: true,
  geminiApiKey: 'AIzaSyBxxrS3p4jIR2ik0jL24rdV9j6PG6VTam4',
  appneta: {
    apiBaseUrl: 'https://demo.pm.appneta.com/api/v3',
    apiKey: '4805b615c62f4d8d84f0a25bdeb740cc',
    demoMode: false // Set to false to use real API with your key
  }
}; 
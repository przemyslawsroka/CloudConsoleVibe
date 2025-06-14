# Security Setup Guide

## ⚠️ CRITICAL SECURITY NOTICE

**API keys and sensitive configuration data have been removed from the repository for security reasons.**

## 🔧 Local Development Setup

### Quick Start

1. **Run the setup script**:
   ```bash
   ./setup-dev-environment.sh
   ```

2. **Start development server**:
   ```bash
   npm start
   ```

### Manual Setup

#### 1. Environment Variables Setup

Copy the template file and add your actual values:

```bash
# Copy the environment template
cp env.template .env

# Edit the .env file with your actual values
nano .env  # or use your preferred editor
```

#### 2. Development Environment Setup

The project uses a template-based approach for secure environment management:

- **Template**: `src/environments/environment.ts.template` - Safe placeholder values (committed to git)
- **Development**: `src/environments/environment.ts` - Real API keys (NOT in git)
- **Production**: `src/environments/environment.prod.ts` - Uses environment variables

To set up your development environment:
```bash
# Copy template and add your API keys
cp src/environments/environment.ts.template src/environments/environment.ts
# Edit environment.ts with your actual API keys
```

#### 3. Available Commands

```bash
# Development with real API keys
npm start

# Build for production
npm run build

# Watch mode for development
npm run watch
```

### 4. Required API Keys

You'll need to obtain the following API keys:

#### Google Cloud APIs
- **Google Client ID**: From Google Cloud Console → APIs & Services → Credentials
- **Google Analytics ID**: From Google Analytics → Admin → Property Settings
- **Gemini API Key**: From Google AI Studio or Google Cloud Console

#### AppNeta API
- **AppNeta API Key**: From your AppNeta dashboard → Settings → API Access
- **AppNeta Base URL**: Your organization's AppNeta endpoint (e.g., `https://your-org.pm.appneta.com/api/v3`)

## 🚀 Production Deployment

### Environment Variables

Set these environment variables in your production environment:

```bash
# Google Cloud Configuration
export GOOGLE_CLIENT_ID="your-actual-google-client-id"
export GOOGLE_ANALYTICS_ID="your-actual-analytics-id"
export GEMINI_API_KEY="your-actual-gemini-api-key"

# API Configuration
export API_BASE_URL="https://your-backend-url.com"
export AUTH_DOMAIN="accounts.google.com"
export LOG_LEVEL="error"
export ENABLE_ANALYTICS="true"

# AppNeta Configuration
export APPNETA_API_BASE_URL="https://your-org.pm.appneta.com/api/v3"
export APPNETA_API_KEY="your-actual-appneta-api-key"
export APPNETA_DEMO_MODE="false"
```

### Docker Deployment

If using Docker, create a `.env` file (not committed to git):

```dockerfile
# In your Dockerfile
COPY .env .env
RUN export $(cat .env | xargs)
```

### Cloud Deployment

#### Google Cloud Run
```bash
gcloud run deploy --set-env-vars="GOOGLE_CLIENT_ID=your-value,APPNETA_API_KEY=your-value"
```

#### Kubernetes
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  GOOGLE_CLIENT_ID: "your-value"
  APPNETA_API_KEY: "your-value"
```

## 🔒 Security Best Practices

### 1. API Key Management
- ✅ Never commit API keys to git
- ✅ Use environment variables for all sensitive data
- ✅ Rotate API keys regularly
- ✅ Use different keys for development/staging/production
- ✅ Implement key rotation policies

### 2. Access Control
- ✅ Limit API key permissions to minimum required
- ✅ Use service accounts where possible
- ✅ Implement IP restrictions if available
- ✅ Monitor API key usage

### 3. Development Security
- ✅ Use demo/sandbox environments for development
- ✅ Never use production keys in development
- ✅ Implement proper error handling to avoid key leakage
- ✅ Use HTTPS for all API communications

## 🛠️ Demo Mode

For development and testing without real API keys, the application supports demo mode:

```bash
# Run in demo mode (set demoMode: true in environment.ts)
npm start
```

The application will automatically detect invalid API keys and switch to demo mode. For development, real API keys are configured in `environment.ts`.

## 📋 Checklist

Before deploying to production:

- [ ] All API keys removed from code
- [ ] Environment variables configured
- [ ] Demo mode disabled in production
- [ ] HTTPS enabled
- [ ] Error handling doesn't expose sensitive data
- [ ] API key rotation schedule established
- [ ] Monitoring and alerting configured

## 🚨 Security Incident Response

If API keys are accidentally committed:

1. **Immediately revoke the exposed keys**
2. **Generate new API keys**
3. **Update all environments with new keys**
4. **Review git history and remove sensitive data**
5. **Notify relevant stakeholders**

## 📞 Support

For security-related questions or incidents:
- Review this documentation
- Check environment configuration
- Verify API key permissions
- Contact your security team if needed

---

**Remember: Security is everyone's responsibility. When in doubt, ask!** 
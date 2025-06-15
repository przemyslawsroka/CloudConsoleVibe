# Security Setup Guide

## 🔒 Environment Configuration Security

This project uses a template-based approach to manage sensitive environment variables securely.

## 📁 File Structure

```
src/environments/
├── environment.ts.template     # Template with placeholder values (in git)
├── environment.ts             # Actual config with real values (gitignored, for local dev)
├── environment.prod.ts        # Production config using env vars (in git)
```

## 🚀 Initial Setup

### For New Developers

1. **Clone the repository**
2. **Create environment file from template:**
   ```bash
   cp src/environments/environment.ts.template src/environments/environment.ts
   ```
3. **Update the API keys in `environment.ts`:**
   ```typescript
   export const environment = {
     production: false,
     // ... other config ...
     geminiApiKey: 'YOUR_ACTUAL_GEMINI_API_KEY',
     appneta: {
       apiBaseUrl: 'https://demo.pm.appneta.com/api/v3',
       apiKey: 'YOUR_ACTUAL_APPNETA_API_KEY',
       demoMode: false
     }
   };
   ```

### Automated Setup Script

Run the setup script to automatically configure your development environment:

```bash
./setup-dev-environment.sh
```

## 🔄 Development Workflow

### Local Development
- `environment.ts` contains real API keys for local development
- This file is gitignored and never committed
- Use `npm start` or `ng serve` as normal

### Production Deployment
- Production uses `environment.prod.ts` which reads from environment variables
- API keys are injected via Cloud Run environment variables
- The Dockerfile creates `environment.ts` from template during build
- Use `./deploy-cloudbuild.sh` to deploy

## ⚠️ Important Notes

### DO NOT COMMIT `environment.ts`
- This file contains real API keys and is gitignored
- If you accidentally add it to git, run:
  ```bash
  git rm --cached src/environments/environment.ts
  git commit -m "Remove environment.ts from tracking"
  ```

### Local Development Requires `environment.ts`
- The Angular compiler needs this file to build locally
- Always create it from the template after cloning
- Keep your local copy updated with real API keys for development

### Production Deployment is Secure
- No real API keys in the repository
- Environment variables injected at runtime
- Template-based approach maintains security

## 🔧 Troubleshooting

### "Cannot find module environment" Error
This means `environment.ts` is missing. Fix with:
```bash
cp src/environments/environment.ts.template src/environments/environment.ts
```

### Local Development Not Working
1. Ensure `environment.ts` exists and has real API keys
2. Check that the file is not empty or corrupted
3. Verify API keys are valid and properly formatted

### Production Deployment Issues
1. Check that `environment.ts.template` exists in repository
2. Verify Cloud Run environment variables are set correctly
3. Ensure Dockerfile creates environment.ts from template

## 🛡️ Security Best Practices

1. **Never commit real API keys**
2. **Always use the template for new setups**
3. **Keep production keys in Cloud Run environment variables**
4. **Regularly rotate API keys**
5. **Use different keys for development and production when possible**

## 📋 Verification

Run the verification script to check your setup:
```bash
./verify-setup.sh
```

This will verify:
- Template file exists
- Environment file is properly configured
- Build process works
- Security measures are in place

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
# Security Fix: API Key Management

## Problem
The previous deployment configuration had API keys hardcoded in `cloudbuild.yaml`, which posed a security risk when committing to the repository.

## Solution
Moved to a simpler, more secure approach similar to the development environment:

### New Structure
- **Development**: `environment.ts` (gitignored, contains real keys)
- **Production**: `environment.prod.ts` (gitignored, contains real keys)
- **Templates**: `environment.ts.template` and `environment.prod.ts.template` (committed, safe placeholders)

### Changes Made
1. **Moved API keys** from `cloudbuild.yaml` to `environment.prod.ts`
2. **Added to .gitignore**: `environment.prod.ts` to prevent committing secrets
3. **Created template**: `environment.prod.ts.template` for reference
4. **Simplified deployment**: Removed runtime environment injection complexity
5. **Cleaned up files**: Removed `env-config.sh`, `env-config.js`, `docker-entrypoint.sh`

### Security Benefits
- ✅ No API keys in repository
- ✅ Simple, consistent approach for dev and prod
- ✅ Template files provide safe reference
- ✅ Build process works identically for both environments

### Deployment Process
1. Ensure `environment.prod.ts` exists locally with real API keys
2. Run deployment: `./deploy-cloudbuild.sh`
3. Docker build copies the file during build process
4. Production app uses the embedded configuration

### API Keys Location
- **Development**: `src/environments/environment.ts` (local only)
- **Production**: `src/environments/environment.prod.ts` (local only)
- **Repository**: Only template files with safe placeholders 
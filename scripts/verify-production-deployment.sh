#!/bin/bash

set -e

echo "🔍 Verifying Production Deployment Configuration..."

# Check if required files exist
echo "📁 Checking required files..."
required_files=("cloudbuild.yaml" "Dockerfile" "env-config.sh" "docker-entrypoint.sh" "src/environments/environment.prod.ts")

for file in "${required_files[@]}"; do
    if [[ -f "$file" ]]; then
        echo "✅ $file exists"
    else
        echo "❌ $file is missing"
        exit 1
    fi
done

# Check if environment.ts template exists (should not be in repo)
if [[ -f "src/environments/environment.ts" ]]; then
    echo "⚠️  WARNING: environment.ts exists in repository - this should be template-based"
    echo "   Make sure it doesn't contain real API keys"
fi

if [[ -f "src/environments/environment.ts.template" ]]; then
    echo "✅ environment.ts.template exists (good for development setup)"
fi

# Verify Angular build works
echo "🔨 Testing Angular build..."
if npm run build --silent; then
    echo "✅ Angular build successful"
    rm -rf dist/
else
    echo "❌ Angular build failed"
    exit 1
fi

# Verify environment configuration script syntax
echo "🌍 Testing environment configuration script..."
if bash -n env-config.sh; then
    echo "✅ env-config.sh syntax is valid"
else
    echo "❌ env-config.sh has syntax errors"
    exit 1
fi

echo ""
echo "✅ All pre-deployment checks passed!"
echo ""
echo "🚀 Ready to deploy to production with:"
echo "   ./deploy-cloudbuild.sh"
echo ""
echo "📋 Production Environment Variables to be configured:"
echo "   - APPNETA_API_KEY=<your-appneta-api-key>"
echo "   - APPNETA_API_BASE_URL=https://demo.pm.appneta.com/api/v3"
echo "   - APPNETA_DEMO_MODE=false (live mode)"
echo "   - GOOGLE_CLIENT_ID=<your-google-client-id>"
echo "   - GEMINI_API_KEY=<your-gemini-api-key>"
echo ""
echo "⚠️  Note: API keys are configured in Cloud Run environment variables"
echo "   and will be injected at runtime via env-config.sh" 
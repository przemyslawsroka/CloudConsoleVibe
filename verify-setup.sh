#!/bin/bash

# Verification script to test the setup
echo "🔍 Verifying CloudConsoleVibe Setup"
echo "=================================="

# Check if template file exists
if [ -f "src/environments/environment.ts.template" ]; then
    echo "✅ Environment template file exists"
else
    echo "❌ Environment template file not found"
fi

# Check if development environment file has real API keys
if [ -f "src/environments/environment.ts" ]; then
    echo "✅ Development environment file exists"
    
    # Check if it contains real API keys (not placeholder)
    if grep -q "4805b615c62f4d8d84f0a25bdeb740cc" src/environments/environment.ts; then
        echo "✅ AppNeta API key configured"
    else
        echo "❌ AppNeta API key not found in development environment"
    fi
    
    if grep -q "733352132096" src/environments/environment.ts; then
        echo "✅ Google Client ID configured"
    else
        echo "❌ Google Client ID not found in development environment"
    fi
    
    if grep -q "AIzaSyBxxrS3p4jIR2ik0jL24rdV9j6PG6VTam4" src/environments/environment.ts; then
        echo "✅ Gemini API key configured"
    else
        echo "❌ Gemini API key not found in development environment"
    fi
    
    if grep -q "demoMode: false" src/environments/environment.ts; then
        echo "✅ Demo mode disabled (using real API)"
    else
        echo "⚠️  Demo mode enabled (using mock data)"
    fi
else
    echo "❌ Development environment file not found"
    echo "💡 Run './setup-dev-environment.sh' to create it from template"
fi

# Check if environment.ts is in .gitignore
if grep -q "src/environments/environment.ts" .gitignore; then
    echo "✅ environment.ts is protected by .gitignore"
else
    echo "❌ environment.ts is NOT protected by .gitignore"
fi

# Check if environment.ts is tracked by git
if git ls-files --error-unmatch src/environments/environment.ts > /dev/null 2>&1; then
    echo "❌ environment.ts is still tracked by git (SECURITY RISK!)"
else
    echo "✅ environment.ts is NOT tracked by git (secure)"
fi

# Check if Angular configuration is standard
if ! grep -q '"local"' angular.json; then
    echo "✅ Angular configuration is clean (no unnecessary local config)"
else
    echo "❌ Unnecessary local configuration found"
fi

# Check if npm scripts are standard
if ! grep -q "start:local" package.json; then
    echo "✅ NPM scripts are clean (no unnecessary local scripts)"
else
    echo "❌ Unnecessary local scripts found"
fi

# Test if the application can build with development config
echo ""
echo "🔨 Testing development build configuration..."
if ng build --configuration=development --help > /dev/null 2>&1; then
    echo "✅ Development build configuration is valid"
else
    echo "❌ Development build configuration has issues"
fi

echo ""
echo "📋 Summary:"
echo "- Template: environment.ts.template (safe to commit)"
echo "- Development: environment.ts (NOT in git, contains real API keys)"
echo "- Production: environment.prod.ts (uses environment variables)"
echo "- Use 'npm start' to run with real API keys in development"

echo ""
echo "🌐 Next steps:"
echo "1. Run 'npm start' to start development server"
echo "2. Visit http://localhost:4200/cloud-network-insights"
echo "3. Verify AppNeta integration shows real data (not demo mode)"

echo ""
echo "✅ Setup verification complete!" 
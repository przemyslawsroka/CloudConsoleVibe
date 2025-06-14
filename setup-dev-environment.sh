#!/bin/bash

# Development Environment Setup Script
# This script helps set up the development environment with proper security practices

echo "🔧 Setting up CloudConsoleVibe Development Environment"
echo "=================================================="

# Check if template files exist
if [ ! -f "src/environments/environment.ts.template" ]; then
    echo "❌ Error: environment.ts.template not found!"
    echo "Please ensure you're in the project root directory."
    exit 1
fi

# Create environment.ts from template if it doesn't exist
if [ ! -f "src/environments/environment.ts" ]; then
    echo "📝 Creating environment.ts from template..."
    cp src/environments/environment.ts.template src/environments/environment.ts
    echo "✅ Created environment.ts file"
    echo "⚠️  Please edit src/environments/environment.ts with your actual API keys"
else
    echo "ℹ️  environment.ts file already exists"
fi

# Check if development environment has real API keys
if grep -q "your-google-client-id-here" src/environments/environment.ts; then
    echo "⚠️  Development environment still has placeholder values"
    echo "📝 Please edit src/environments/environment.ts with your actual API keys"
else
    echo "✅ Development environment has real API keys configured"
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp env.template .env
    echo "✅ Created .env file"
    echo "⚠️  Please edit .env with your actual API keys for production deployment"
else
    echo "ℹ️  .env file already exists"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
    echo "✅ Dependencies installed"
else
    echo "ℹ️  Dependencies already installed"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Configuration:"
echo "- Development: Real API keys in src/environments/environment.ts (NOT in git)"
echo "- Production: Environment variables (see .env template)"
echo "- Template: src/environments/environment.ts.template (safe to commit)"
echo ""
echo "📚 For detailed setup instructions, see:"
echo "   - SECURITY_SETUP.md (API key configuration)"
echo "   - README.md (general project information)"
echo ""
echo "🔒 Security reminders:"
echo "   - environment.ts is NOT tracked by git (contains real API keys)"
echo "   - Only environment.ts.template is committed (safe placeholder values)"
echo "   - Production uses environment variables"
echo "   - Rotate API keys regularly"
echo ""
echo "🚀 Ready to start:"
echo "   npm start    # Start development server with real API keys"
echo ""
echo "Happy coding! 🚀" 
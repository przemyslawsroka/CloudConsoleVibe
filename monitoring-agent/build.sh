#!/bin/bash

echo "🔨 Building CloudConsoleVibe Monitoring Agent..."

# Set build variables
BINARY_NAME="monitoring-agent"
VERSION="1.0.0"
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Build flags
LDFLAGS="-X main.Version=${VERSION} -X main.BuildTime=${BUILD_TIME} -X main.GitCommit=${GIT_COMMIT}"

# Build for Linux (target deployment platform)
echo "📦 Building for Linux amd64..."
GOOS=linux GOARCH=amd64 go build -ldflags "${LDFLAGS}" -o ${BINARY_NAME}-linux-amd64 .

if [ $? -eq 0 ]; then
    echo "✅ Build successful: ${BINARY_NAME}-linux-amd64"
    echo "📊 Binary size: $(du -h ${BINARY_NAME}-linux-amd64 | cut -f1)"
else
    echo "❌ Build failed"
    exit 1
fi

# Create deployment package
echo "📦 Creating deployment package..."
mkdir -p dist
cp ${BINARY_NAME}-linux-amd64 dist/
cp install.sh dist/
cp config.json.template dist/

# Create tarball
tar -czf dist/monitoring-agent-${VERSION}.tar.gz -C dist .

echo "✅ Deployment package created: dist/monitoring-agent-${VERSION}.tar.gz"
echo "🚀 Ready for deployment!" 
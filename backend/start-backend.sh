#!/bin/bash

# CloudConsoleVibe Backend Startup Script

echo "🚀 Starting CloudConsoleVibe Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node --version)"
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p data

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run this script from the backend directory."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Check if .env file exists, create from template if not
if [ ! -f ".env" ]; then
    if [ -f "config.env.example" ]; then
        echo "⚙️  Creating .env from template..."
        cp config.env.example .env
        echo "📝 Please edit .env file with your configuration"
    else
        echo "⚠️  No .env file found. Using default configuration."
    fi
fi

# Set default environment variables if not set
export PORT=${PORT:-8080}
export HOST=${HOST:-0.0.0.0}
export NODE_ENV=${NODE_ENV:-development}

echo "🌐 Server will start on: http://${HOST}:${PORT}"
echo "🔌 WebSocket endpoint: ws://${HOST}:${PORT}/api/v1/agents/connect"
echo "📊 Health check: http://${HOST}:${PORT}/health"

# Start the server
if [ "$NODE_ENV" = "development" ]; then
    echo "🔧 Starting in development mode..."
    if command -v nodemon &> /dev/null; then
        exec nodemon server.js
    else
        echo "⚠️  nodemon not found, installing..."
        npm install -g nodemon
        exec nodemon server.js
    fi
else
    echo "🏭 Starting in production mode..."
    exec node server.js
fi 
#!/bin/bash

echo "🚀 Installing Wallet Farm Visual Simulator Frontend"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | sed 's/v//')
REQUIRED_VERSION="18.0.0"

if ! [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please upgrade to Node.js 18+."
    exit 1
fi

echo "✅ Node.js $NODE_VERSION detected"

# Navigate to frontend directory
cd wallet-simulator

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Create environment file if it doesn't exist
if [ ! -f .env.local ]; then
    echo ""
    echo "📝 Creating environment configuration..."
    cat > .env.local << EOF
# Wallet Farm Visual Simulator Environment Configuration

# Backend API URL (adjust if your backend runs on different port)
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# WebSocket URL for real-time updates
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
EOF
    echo "✅ Created .env.local with default configuration"
fi

echo ""
echo "🎉 Frontend installation complete!"
echo ""
echo "To start the development server:"
echo "  cd wallet-simulator"
echo "  npm run dev"
echo ""
echo "Then open http://localhost:3000 in your browser"
echo ""
echo "Make sure the Wallet Farm backend is running on port 3001"
echo "See the main project README for backend setup instructions"

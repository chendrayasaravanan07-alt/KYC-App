#!/bin/bash

# KYC System VS Code Setup Script
echo "🚀 Setting up KYC Verification System in VS Code..."

# Check if VS Code is installed
if command -v code &> /dev/null; then
    echo "✅ VS Code found"
else
    echo "❌ VS Code not found. Please install VS Code first: https://code.visualstudio.com/"
    exit 1
fi

# Open project in VS Code
echo "📂 Opening project in VS Code..."
code . --install-extension esbenp.prettier-vscode
code . --install-extension dbaeumer.vscode-eslint
code . --install-extension bradlc.vscode-tailwindcss
code . --install-extension ms-vscode.vscode-typescript-next
code . --install-extension formaldendry.auto-rename-tag
code . --install-extension christan-kohler.path-intellisense
code . --install-extension ms-vscode.vscode-jest
code . --install-extension humao.rest-client
code . --install-extension ms-vscode.vscode-thunder-client
code . --install-extension ms-vscode-remote.remote-containers
code . --install-extension ms-vscode.vscode-docker

# Open workspace
echo "🔧 Opening VS Code workspace..."
code "KYC-System.code-workspace"

echo "✅ VS Code setup complete!"
echo ""
echo "🎯 Next Steps in VS Code:"
echo "1. Open Terminal (Ctrl + \`) or (Ctrl + Shift + \` on Windows"
echo "2. Install dependencies:"
echo "   - cd backend && npm install"
echo "   - cd admin-panel && npm install"
echo "3. Start development:"
echo "   - Open Command Palette (Ctrl + Shift + P)"
echo "   - Type: 'Tasks: Run Task'"
echo "   - Choose: 'Setup Project' or 'Start Full Development Environment'"
echo ""
echo "🚀 Or use Launch & Debug (F5) to start the backend server"
echo "📊 Admin Panel will be available at: http://localhost:5173"
echo "🔗 Backend API will be available at: http://localhost:5000"
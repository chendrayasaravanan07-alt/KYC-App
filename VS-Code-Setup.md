# 🚀 KYC Verification System - VS Code Development Guide

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setup Instructions](#setup-instructions)
3. [VS Code Configuration](#vs-code-configuration)
4. [Development Workflow](#development-workflow)
5. [Debugging](#debugging)
6. [Available Tasks](#available-tasks)
7. [Extensions](#recommended-extensions)
8. [Project Structure](#project-structure)

## 🔧 Prerequisites

Before you begin, ensure you have:

1. **VS Code** installed ([Download](https://code.visualstudio.com/))
2. **Node.js** (v18 or higher) installed ([Download](https://nodejs.org/))
3. **MongoDB** (Optional, for full features) [Download](https://www.mongodb.com/)
4. **Redis** (Optional, for caching) [Download](https://redis.io/)

## 🚀 Quick Setup

### **Option 1: Automatic Setup**
```bash
# Clone or navigate to your project directory
cd /path/to/KYC-App

# Run the setup script
./scripts/vscode-setup.sh
```

### **Option 2: Manual Setup**

1. **Open Project in VS Code**
   ```bash
   code .
   ```

2. **Open Workspace File**
   - Go to `File` → `Open Workspace`
   - Select `KYC-System.code-workspace`

3. **Install Extensions**
   - VS Code will prompt to install recommended extensions
   - Or install manually from Extensions tab

4. **Install Dependencies**
   ```bash
   # Backend
   cd backend
   npm install

   # Admin Panel
   cd ../admin-panel
   npm install
   ```

## ⚙️ VS Code Configuration

### **Workspace Features**

The VS Code workspace includes:

- **🎨 Custom Settings**: Tailored for React/Node development
- **🐛 Debug Configurations**: Pre-configured debug scenarios
- **🔧 Tasks**: Automated development tasks
- **📁 Multi-root Workspace**: Organized project structure
- **🔌 Recommended Extensions**: Essential development tools

### **Settings Overview**

- **Editor**: Auto-format, code actions, save behavior
- **File Nesting**: Group related files together
- **Search Exclusions**: Ignore node_modules, build folders
- **Terminal**: Integrated terminal with bash/zsh support

## 🛠️ Development Workflow

### **Method 1: Using Tasks (Recommended)**

1. **Open Command Palette** (`Ctrl + Shift + P` or `Cmd + Shift + P`)
2. **Type**: `Tasks: Run Task`
3. **Choose from available tasks**:

#### **Setup Tasks:**
- `Setup Project` - Install all dependencies
- `Install Backend Dependencies`
- `Install Admin Panel Dependencies`

#### **Development Tasks:**
- `Start Full Development Environment` - Start both backend and frontend
- `Start Backend Server (Simple)` - Mock API for development
- `Start Admin Panel` - React development server

### **Method 2: Using Integrated Terminal**

1. **Open Terminal** (`Ctrl + \` or `Ctrl + Shift + ```)
2. **Run commands manually**:

```bash
# Terminal 1 - Backend
node backend/server-simple.js

# Terminal 2 - Frontend
cd admin-panel && npm run dev
```

### **Method 3: Using Debug & Launch**

1. **Open Debug View** (`Ctrl + Shift + D` or `Cmd + Shift + D`)
2. **Select configuration**:
   - `Debug Backend Server`
   - `Debug Backend (Production Mode)`
   - `Launch Full KYC System`

## 🐛 Debugging

### **Backend Debugging**

1. **Set breakpoints** in backend files
2. **Press F5** or use Debug and Run
3. **Select** `Debug Backend Server` configuration
4. **Use Debug Console** for variable inspection

### **Frontend Debugging**

1. **Use Chrome DevTools** (F12 in browser)
2. **React DevTools** extension recommended
3. **VS Code Debug** for React components:
   - Install React Developer Tools
   - Set breakpoints in JSX/TSX files

### **Network Debugging**

Use VS Code's REST Client or Thunder Client:
- Create HTTP requests
- Test API endpoints
- Monitor responses

## 📋 Available Tasks

### **Project Setup**
- ✅ **Setup Project** - Install all project dependencies
- ✅ **Install Backend Dependencies** - Backend npm packages
- ✅ **Install Admin Panel Dependencies** - Frontend npm packages

### **Development**
- ✅ **Start Full Development Environment** - Run both services
- ✅ **Start Backend Server (Simple)** - Mock API server
- ✅ **Start Backend Server (Full)** - Full MongoDB backend
- ✅ **Start Admin Panel** - React development server

### **Database (Optional)**
- ✅ **Start MongoDB** - Local MongoDB instance
- ✅ **Start Redis** - Redis cache server

## 🔌 Recommended Extensions

### **Core Extensions**
- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **Tailwind CSS IntelliSense** - CSS class suggestions
- **TypeScript Importer** - Auto import organization

### **React/Node Extensions**
- **React Snippets** - React code shortcuts
- **Auto Rename Tag** - HTML/XML tag renaming
- **Path Intellisense** - File path suggestions

### **Database & API**
- **MongoDB for VS Code** - Database management
- **REST Client** - API testing
- **Thunder Client** - Advanced API testing

### **Development Tools**
- **GitLens** - Git integration
- **Live Server** - Static file serving
- **Docker** - Container management
- **Todo Tree** - Task tracking

## 📁 Project Structure

```
KYC-App/
├── .vscode/                    # VS Code configuration
│   ├── settings.json          # Editor settings
│   ├── launch.json            # Debug configurations
│   ├── tasks.json            # Build tasks
│   └── extensions.json       # Recommended extensions
├── backend/                    # Node.js API server
│   ├── src/                   # Source code
│   ├── package.json          # Dependencies
│   └── server.js             # Main server file
├── admin-panel/                # React admin dashboard
│   ├── src/                   # React source
│   ├── package.json          # Dependencies
│   └── vite.config.js         # Vite configuration
├── mobile-app/                 # React Native mobile app
├── scripts/                    # Utility scripts
└── KYC-System.code-workspace # VS Code workspace file
```

## 🎯 Access URLs

Once running:

- **Admin Panel**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## 🚨 Common Issues & Solutions

### **Port Already in Use**
```bash
# Check what's using the port
lsof -i :5000
lsof -i :5173

# Kill the process
kill -9 <PID>
```

### **Dependencies Not Installing**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### **VS Code Extensions Not Installing**
```bash
# Install manually from command line
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
```

### **ESLint/Prettier Conflicts**
```bash
# Open VS Code settings
# Search for "format on save"
# Configure your preferences
```

## 🚀 Development Commands

### **In Terminal**

```bash
# Backend (Simple - Mock API)
node backend/server-simple.js

# Backend (Full - with MongoDB)
node backend/server.js

# Admin Panel Development
cd admin-panel && npm run dev

# Build for Production
cd admin-panel && npm run build

# Run Tests
cd backend && npm test
```

### **Using VS Code Tasks**
1. **Command Palette**: `Ctrl + Shift + P`
2. **Type**: `Tasks: Run Task`
3. **Select** your desired task

## 📚 Additional Resources

- [VS Code Documentation](https://code.visualstudio.com/docs)
- [React Documentation](https://react.dev)
- [Node.js Documentation](https://nodejs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Vite Documentation](https://vitejs.dev)

---

**🎉 Happy Coding!** The KYC Verification System is now configured for optimal development in VS Code.
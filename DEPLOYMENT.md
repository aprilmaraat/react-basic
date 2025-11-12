# Deployment Guide - React Basic App

This guide provides multiple deployment options for running this React application on your local machine and accessing it anytime.

## Table of Contents
1. [Development Mode (Recommended for Testing)](#1-development-mode)
2. [Production Build - Serve Locally](#2-production-build---serve-locally)
3. [Production Build - Windows IIS](#3-production-build---windows-iis)
4. [Production Build - Docker](#4-production-build---docker)
5. [Background Service (Windows)](#5-background-service-windows)

---

## Prerequisites

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download](https://git-scm.com/)
- Backend API running (default: `http://127.0.0.1:8000`)

---

## 1. Development Mode

**Best for:** Quick testing and development

### Steps:

```bash
# Clone the repository
git clone https://github.com/aprilmaraat/react-basic.git
cd react-basic

# Install dependencies
npm install

# Start development server
npm start
```

The app will automatically open at `http://localhost:3000`

**Pros:**
- Fast setup
- Hot reload on code changes
- Easy debugging

**Cons:**
- Not optimized for production
- Must keep terminal window open

---

## 2. Production Build - Serve Locally

**Best for:** Running optimized version locally with better performance

### Steps:

#### A. Build the Production Bundle

```bash
# Build optimized production files
npm run build
```

This creates a `build/` folder with optimized static files.

#### B. Install a Static Server

```bash
# Install serve globally
npm install -g serve
```

#### C. Run the Production Build

```bash
# Serve the build folder
serve -s build -l 3000
```

**Access:** `http://localhost:3000`

#### D. Keep Running in Background (PowerShell)

```powershell
# Start serve in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; serve -s build -l 3000"
```

Or create a batch file `start-app.bat`:

```batch
@echo off
cd /d "%~dp0"
start cmd /k "serve -s build -l 3000"
```

**Pros:**
- Production-optimized
- Faster performance
- Can run as background process

**Cons:**
- Need to rebuild after code changes

---

## 3. Production Build - Windows IIS

**Best for:** Enterprise environment with IIS server

### Prerequisites:
- Windows 10/11 Pro or Windows Server
- IIS enabled (Control Panel > Programs > Turn Windows features on/off > Internet Information Services)

### Steps:

#### A. Build the Project

```bash
npm run build
```

#### B. Configure IIS

1. Open **IIS Manager**
2. Right-click **Sites** > **Add Website**
3. Set:
   - **Site name:** `ReactBasicApp`
   - **Physical path:** `C:\Users\AprilJohnMaraat\source\repos\personal\react-basic\build`
   - **Port:** `3000` (or any available port)
4. Click **OK**

#### C. Add URL Rewrite Rule

Create `web.config` in the `build` folder:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
    </staticContent>
  </system.webServer>
</configuration>
```

#### D. Start the Site

In IIS Manager, right-click the site and select **Start**

**Access:** `http://localhost:3000`

**Pros:**
- Runs as Windows service (always available)
- Professional deployment
- No terminal needed

**Cons:**
- Requires IIS setup
- More complex configuration

---

## 4. Production Build - Docker

**Best for:** Containerized deployment, easy portability

### Steps:

#### A. Create Dockerfile

Create `Dockerfile` in project root:

```dockerfile
# Build stage
FROM node:16-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

#### B. Create nginx.conf

```nginx
server {
    listen 3000;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### C. Build and Run

```bash
# Build Docker image
docker build -t react-basic-app .

# Run container
docker run -d -p 3000:3000 --name react-app react-basic-app
```

**Access:** `http://localhost:3000`

#### D. Docker Commands

```bash
# Stop container
docker stop react-app

# Start container
docker start react-app

# Remove container
docker rm react-app

# View logs
docker logs react-app
```

**Pros:**
- Isolated environment
- Easy to deploy anywhere
- Consistent across machines

**Cons:**
- Requires Docker Desktop
- Additional learning curve

---

## 5. Background Service (Windows)

**Best for:** Running app as a Windows service that starts automatically

### Using PM2 (Process Manager)

#### A. Install PM2

```bash
npm install -g pm2
```

#### B. Create Ecosystem File

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'react-basic-app',
    script: 'serve',
    args: '-s build -l 3000',
    cwd: __dirname,
    watch: false,
    autorestart: true,
    max_restarts: 10,
    env: {
      NODE_ENV: 'production'
    }
  }]
}
```

#### C. Start with PM2

```bash
# Build first
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on Windows boot
pm2-startup install
```

#### D. PM2 Commands

```bash
# View running apps
pm2 list

# View logs
pm2 logs react-basic-app

# Restart app
pm2 restart react-basic-app

# Stop app
pm2 stop react-basic-app

# Remove app
pm2 delete react-basic-app
```

**Access:** `http://localhost:3000`

**Pros:**
- Runs in background
- Auto-restart on failure
- Starts on system boot
- Process monitoring

**Cons:**
- Requires PM2 installation

---

## Environment Configuration

### Configure API Backend

Create `.env` file in project root:

```env
REACT_APP_API_BASE_URL=http://127.0.0.1:8000
```

**Note:** After changing `.env`, you must rebuild:

```bash
npm run build
```

---

## Access from Other Devices (Network)

To access from other devices on your local network:

1. Find your local IP address:
   ```bash
   ipconfig
   ```
   Look for `IPv4 Address` (e.g., `192.168.1.100`)

2. Update your server to listen on all interfaces:
   ```bash
   # For serve
   serve -s build -l 3000 --listen 0.0.0.0
   
   # For development
   set HOST=0.0.0.0 && npm start
   ```

3. Configure Windows Firewall:
   - Open **Windows Defender Firewall**
   - Click **Advanced settings**
   - **Inbound Rules** > **New Rule**
   - Select **Port** > **TCP** > Specific port: `3000`
   - Allow the connection
   - Apply to all profiles

4. Access from other devices:
   ```
   http://192.168.1.100:3000
   ```

---

## Recommended Setup for Local Always-On Deployment

**Best Choice: PM2 with Production Build**

```bash
# One-time setup
npm install -g pm2 serve
npm run build

# Start service
pm2 start serve --name "react-basic-app" -- -s build -l 3000
pm2 save
pm2-startup install

# Done! App will run in background and start on boot
```

**Access anytime:** `http://localhost:3000`

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process by PID
taskkill /PID <PID> /F
```

### Cannot Connect to Backend API

1. Verify backend is running at `http://127.0.0.1:8000`
2. Check `.env` file has correct `REACT_APP_API_BASE_URL`
3. Rebuild after changing `.env`: `npm run build`
4. Check browser console for CORS errors

### Build Fails

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### PM2 Service Not Starting on Boot

```bash
# Reinstall PM2 startup
pm2 unstartup
pm2-startup install
pm2 save
```

---

## Performance Optimization

### Enable Caching (nginx.conf for Docker/IIS)

```nginx
location /static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location /api/ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

### Compress Assets

Already enabled in production build. Verify with:

```bash
# Check build folder sizes
dir build\static\js
```

---

## Security Considerations

1. **HTTPS:** For production, use HTTPS with SSL certificate
2. **Environment Variables:** Never commit `.env` with sensitive data
3. **Firewall:** Only open necessary ports
4. **Updates:** Regularly update dependencies:
   ```bash
   npm audit
   npm audit fix
   ```

---

## Summary Table

| Method | Complexity | Auto-Start | Performance | Best For |
|--------|-----------|------------|-------------|----------|
| Development | ⭐ | ❌ | Low | Testing |
| Serve | ⭐⭐ | ❌ | High | Quick Deploy |
| IIS | ⭐⭐⭐⭐ | ✅ | High | Enterprise |
| Docker | ⭐⭐⭐ | ✅ | High | Portability |
| PM2 | ⭐⭐ | ✅ | High | **Recommended** |

---

## Quick Start (Recommended)

```bash
# Install dependencies
npm install

# Build production version
npm run build

# Install PM2 and serve
npm install -g pm2 serve

# Start as background service
pm2 start serve --name "react-basic-app" -- -s build -l 3000

# Save and enable auto-start
pm2 save
pm2-startup install

# Done! Access at http://localhost:3000
```

Your app is now running and will automatically start when Windows boots! 🚀

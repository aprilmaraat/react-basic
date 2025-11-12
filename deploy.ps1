# React Basic App - Quick Start Script
# This script helps you deploy the app for local always-on access

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  React Basic App - Deployment Setup  " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js is installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Select deployment method:" -ForegroundColor Yellow
Write-Host "1. Development Mode (Quick test, not optimized)"
Write-Host "2. Production Build + Serve (Simple, manual start)"
Write-Host "3. PM2 Service (Recommended - Auto-start on boot)"
Write-Host "4. Docker Container (Isolated environment)"
Write-Host ""

$choice = Read-Host "Enter your choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Starting in Development Mode..." -ForegroundColor Green
        Write-Host "The app will open at http://localhost:3000" -ForegroundColor Cyan
        Write-Host ""
        npm install
        npm start
    }
    "2" {
        Write-Host ""
        Write-Host "Building production version..." -ForegroundColor Green
        npm install
        npm run build
        
        Write-Host ""
        Write-Host "Installing serve globally..." -ForegroundColor Green
        npm install -g serve
        
        Write-Host ""
        Write-Host "Starting production server..." -ForegroundColor Green
        Write-Host "Access the app at: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
        Write-Host ""
        serve -s build -l 3000
    }
    "3" {
        Write-Host ""
        Write-Host "Setting up PM2 service..." -ForegroundColor Green
        
        # Install dependencies
        npm install
        
        # Build production
        Write-Host "Building production version..." -ForegroundColor Green
        npm run build
        
        # Install PM2 and serve
        Write-Host "Installing PM2 and serve..." -ForegroundColor Green
        npm install -g pm2 serve
        
        # Start PM2 service
        Write-Host "Starting PM2 service..." -ForegroundColor Green
        pm2 start ecosystem.config.js
        pm2 save
        
        # Setup startup
        Write-Host "Configuring auto-start on boot..." -ForegroundColor Green
        pm2 startup
        
        Write-Host ""
        Write-Host "======================================" -ForegroundColor Green
        Write-Host "  Deployment Complete!" -ForegroundColor Green
        Write-Host "======================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Your app is running at: http://localhost:3000" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Useful PM2 commands:" -ForegroundColor Yellow
        Write-Host "  pm2 list          - View running apps" -ForegroundColor White
        Write-Host "  pm2 logs          - View logs" -ForegroundColor White
        Write-Host "  pm2 restart all   - Restart app" -ForegroundColor White
        Write-Host "  pm2 stop all      - Stop app" -ForegroundColor White
        Write-Host ""
    }
    "4" {
        Write-Host ""
        Write-Host "Setting up Docker container..." -ForegroundColor Green
        
        # Check if Docker is installed
        try {
            $dockerVersion = docker --version
            Write-Host "[OK] Docker is installed: $dockerVersion" -ForegroundColor Green
        } catch {
            Write-Host "[ERROR] Docker is not installed!" -ForegroundColor Red
            Write-Host "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
            exit 1
        }
        
        # Build Docker image
        Write-Host "Building Docker image..." -ForegroundColor Green
        docker build -t react-basic-app .
        
        # Run container
        Write-Host "Starting container..." -ForegroundColor Green
        docker run -d -p 3000:3000 --name react-app --restart unless-stopped react-basic-app
        
        Write-Host ""
        Write-Host "======================================" -ForegroundColor Green
        Write-Host "  Docker Deployment Complete!" -ForegroundColor Green
        Write-Host "======================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Your app is running at: http://localhost:3000" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Useful Docker commands:" -ForegroundColor Yellow
        Write-Host "  docker ps             - View running containers" -ForegroundColor White
        Write-Host "  docker logs react-app - View logs" -ForegroundColor White
        Write-Host "  docker restart react-app - Restart container" -ForegroundColor White
        Write-Host "  docker stop react-app - Stop container" -ForegroundColor White
        Write-Host ""
    }
    default {
        Write-Host "Invalid choice. Please run the script again." -ForegroundColor Red
        exit 1
    }
}

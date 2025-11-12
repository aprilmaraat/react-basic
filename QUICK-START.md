# 🚀 Quick Deployment Instructions

## For Your Local Machine - Access Anytime

### ⭐ **Recommended Method: PM2 (Auto-Start Service)**

This will make your app run in the background and start automatically when you turn on your computer.

#### **Step-by-Step:**

1. **Open PowerShell** in your project folder:
   ```powershell
   cd c:\Users\AprilJohnMaraat\source\repos\personal\react-basic
   ```

2. **Run the deployment script:**
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\deploy.ps1
   ```
   
3. **Select option 3** (PM2 Service)

4. **Done!** Your app is now running at `http://localhost:3000` 

#### **Or Manual Setup:**

```powershell
# Build the app
npm run build

# Install PM2 and serve
npm install -g pm2 serve

# Start the service
pm2 start serve --name "react-basic-app" -- -s build -l 3000

# Save configuration and enable auto-start
pm2 save
pm2 startup
```

**Follow the command that PM2 shows you to enable startup.**

---

## 📱 Access Your App

### On Your Computer:
```
http://localhost:3000
```

### From Other Devices (Phone, Tablet, Other Computer):

1. **Find Your IP Address:**
   ```powershell
   ipconfig
   ```
   Look for `IPv4 Address` (e.g., `192.168.1.100`)

2. **Allow Through Firewall:**
   - Windows Search: `Windows Defender Firewall with Advanced Security`
   - Click `Inbound Rules` → `New Rule`
   - Select `Port` → Next
   - TCP, Specific port: `3000` → Next
   - Allow the connection → Next
   - Check all profiles → Next
   - Name: `React Basic App` → Finish

3. **Access from any device on your network:**
   ```
   http://192.168.1.100:3000
   ```
   (Replace with your actual IP address)

---

## 🔧 Managing Your App

### Check Status:
```powershell
pm2 list
```

### View Logs:
```powershell
pm2 logs react-basic-app
```

### Restart:
```powershell
pm2 restart react-basic-app
```

### Stop:
```powershell
pm2 stop react-basic-app
```

### Start Again:
```powershell
pm2 start react-basic-app
```

---

## 🔄 Updating Your App

When you make changes to your code:

```powershell
# 1. Build new version
npm run build

# 2. Restart the service
pm2 restart react-basic-app
```

---

## 🆘 Troubleshooting

### "Port 3000 is already in use"

```powershell
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with the number shown)
taskkill /PID <PID> /F
```

### "Cannot connect to backend"

1. Make sure your backend API is running at `http://127.0.0.1:8000`
2. Check your `.env` file:
   ```
   REACT_APP_API_BASE_URL=http://127.0.0.1:8000
   ```
3. Rebuild after changing `.env`:
   ```powershell
   npm run build
   pm2 restart react-basic-app
   ```

### App not starting on boot

```powershell
# Reinstall startup
pm2 unstartup
pm2 save
pm2 startup
# Run the command PM2 tells you
```

---

## 📋 Quick Reference

| Command | Purpose |
|---------|---------|
| `pm2 list` | Show all running apps |
| `pm2 logs` | View app logs |
| `pm2 restart all` | Restart all apps |
| `pm2 stop all` | Stop all apps |
| `pm2 delete react-basic-app` | Remove app from PM2 |
| `npm run build` | Build production version |
| `start-app.bat` | Quick start (no background) |

---

## 🎯 Alternative: Simple Start (Not Always-On)

If you just want to run it occasionally without it being always on:

**Double-click:** `start-app.bat`

Or in PowerShell:
```powershell
npm run build
npm run serve
```

This will run until you close the window.

---

## ✅ Success Checklist

- [ ] App builds without errors (`npm run build`)
- [ ] App runs at `http://localhost:3000`
- [ ] PM2 shows app as "online" (`pm2 list`)
- [ ] App restarts after reboot
- [ ] Backend connection works (check browser console)
- [ ] Accessible from other devices (if needed)

---

**Need More Options?** See the full guide: [DEPLOYMENT.md](./DEPLOYMENT.md)

**For detailed deployment options including Docker, IIS, and network access, see the complete [DEPLOYMENT.md](./DEPLOYMENT.md) guide.**

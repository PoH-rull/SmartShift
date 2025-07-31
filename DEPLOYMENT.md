# 🚀 Deployment Guide

## Option 1: Vercel (Recommended - Free & Easy)

### Steps:
1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/shift-scheduler.git
   git push -u origin main
   ```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub
   - Click "New Project"
   - Import your GitHub repository
   - Click "Deploy"
   - Your app will be live at `https://your-app-name.vercel.app`

### ✅ Pros:
- Free tier with good limits
- Automatic deployments from GitHub
- Great performance
- Easy custom domains

---

## Option 2: Railway (Great Alternative)

### Steps:
1. **Push to GitHub** (same as above)

2. **Deploy to Railway**:
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will auto-detect Node.js and deploy

### ✅ Pros:
- Simple deployment
- Good free tier
- Automatic HTTPS
- Easy environment variables

---

## Option 3: Heroku (Classic Choice)

### Steps:
1. **Install Heroku CLI**:
   ```bash
   # Windows (using chocolatey)
   choco install heroku-cli
   
   # Or download from heroku.com
   ```

2. **Create Heroku App**:
   ```bash
   heroku login
   heroku create your-shift-scheduler
   ```

3. **Deploy**:
   ```bash
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

### ✅ Pros:
- Well-established platform
- Good documentation
- Add-ons available

### ❌ Cons:
- No longer has free tier
- More complex setup

---

## Option 4: Netlify + Serverless Functions

### Steps:
1. **Restructure for Netlify**:
   - Move API routes to `netlify/functions/`
   - Update paths in frontend

2. **Deploy**:
   - Connect GitHub to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `public`

---

## Option 5: DigitalOcean App Platform

### Steps:
1. **Push to GitHub**
2. **Create App on DigitalOcean**:
   - Go to DigitalOcean App Platform
   - Connect GitHub repository
   - Configure build settings
   - Deploy

### ✅ Pros:
- Good performance
- Scalable
- Professional hosting

### ❌ Cons:
- Costs money (starts at $5/month)

---

## 🔧 Environment Variables

For production, you may want to set:

```bash
NODE_ENV=production
PORT=3000
```

---

## 📱 Custom Domain (Optional)

### For Vercel:
1. Go to your project dashboard
2. Click "Domains"
3. Add your custom domain
4. Update DNS records as instructed

### For Railway:
1. Go to project settings
2. Click "Domains"
3. Add custom domain
4. Update DNS records

---

## 🛡️ Security Considerations

For production deployment:

1. **Add rate limiting**:
   ```bash
   npm install express-rate-limit
   ```

2. **Add helmet for security headers**:
   ```bash
   npm install helmet
   ```

3. **Environment variables for sensitive data**

4. **HTTPS only** (most platforms provide this automatically)

---

## 📊 Monitoring

Consider adding:
- Error tracking (Sentry)
- Analytics (Google Analytics)
- Uptime monitoring (UptimeRobot)

---

## 🎯 Recommended: Start with Vercel

**Why Vercel?**
- ✅ Free tier is generous
- ✅ Automatic deployments from GitHub
- ✅ Great performance globally
- ✅ Easy to set up custom domains
- ✅ Excellent for Node.js apps
- ✅ Built-in analytics

**Your app will be live in under 5 minutes!**
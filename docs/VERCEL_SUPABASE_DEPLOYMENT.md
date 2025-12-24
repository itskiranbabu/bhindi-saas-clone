# 🚀 Complete Vercel + Supabase Deployment Guide

**Deploy both Frontend AND Backend to Vercel with Supabase Database**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Architecture](#architecture)
4. [Step 1: Setup Supabase Database](#step-1-setup-supabase-database)
5. [Step 2: Setup Upstash Redis](#step-2-setup-upstash-redis)
6. [Step 3: Deploy Backend to Vercel](#step-3-deploy-backend-to-vercel)
7. [Step 4: Deploy Frontend to Vercel](#step-4-deploy-frontend-to-vercel)
8. [Step 5: Configure Environment Variables](#step-5-configure-environment-variables)
9. [Step 6: Test Deployment](#step-6-test-deployment)
10. [Troubleshooting](#troubleshooting)

---

## 1. Overview

This guide will help you deploy:
- ✅ **Frontend** → Vercel (React app)
- ✅ **Backend** → Vercel (Serverless functions)
- ✅ **Database** → Supabase (PostgreSQL)
- ✅ **Cache** → Upstash (Redis)

**Total Time**: 30-45 minutes  
**Total Cost**: $0-20/month (can start free)

---

## 2. Prerequisites

### Required Accounts
- ✅ [GitHub Account](https://github.com/signup)
- ✅ [Vercel Account](https://vercel.com/signup)
- ✅ [Supabase Account](https://supabase.com)
- ✅ [Upstash Account](https://upstash.com)
- ✅ [OpenAI Account](https://platform.openai.com) (for API key)

### Required Tools
```bash
# Install Vercel CLI
npm install -g vercel

# Verify installation
vercel --version
```

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Vercel (Frontend + Backend)                 │
│  ┌──────────────────┐    ┌──────────────────┐          │
│  │  Frontend (React)│    │ Backend (API)    │          │
│  │  Static + SSR    │    │ Serverless Funcs │          │
│  └──────────────────┘    └──────────────────┘          │
└─────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────┐         ┌──────────────────────┐
│  Supabase (Database) │         │   Upstash (Redis)    │
│  PostgreSQL 15       │         │   Serverless Redis   │
└──────────────────────┘         └──────────────────────┘
```

---

## 4. Step 1: Setup Supabase Database

### 4.1 Create Supabase Project

1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com
   - Click "New Project"

2. **Fill Project Details**
   ```
   Organization: (Select or create)
   Name: bhindi-saas-db
   Database Password: (Generate strong password - SAVE THIS!)
   Region: (Choose closest to your users)
   Pricing Plan: Free (or Pro for production)
   ```

3. **Wait for Setup**
   - Takes 2-3 minutes
   - Don't close the page

### 4.2 Get Database Connection String

1. **Navigate to Settings**
   - Click "Settings" (gear icon)
   - Click "Database"

2. **Copy Connection String**
   - Find "Connection string" section
   - Select "URI" tab
   - Copy the connection string
   - Format: `postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres`

3. **Replace Password**
   ```
   # Original (with placeholder)
   postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
   
   # Replace [YOUR-PASSWORD] with your actual password
   postgresql://postgres:MyStr0ngP@ssw0rd@db.xxx.supabase.co:5432/postgres
   ```

### 4.3 Run Database Schema

1. **Open SQL Editor**
   - In Supabase Dashboard
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

2. **Copy Schema**
   - Go to: https://github.com/itskiranbabu/bhindi-saas-clone/blob/main/database/schema.sql
   - Copy entire content

3. **Execute Schema**
   - Paste into SQL Editor
   - Click "Run" button
   - Wait for completion (should see "Success")

4. **Verify Tables**
   - Click "Table Editor" in left sidebar
   - You should see 14 tables:
     - users
     - workspaces
     - workspace_members
     - subscriptions
     - usage_quotas
     - conversations
     - messages
     - agents
     - agent_executions
     - tools
     - tool_executions
     - workflows
     - workflow_executions
     - audit_logs
     - api_keys

### 4.4 Enable Row Level Security (Optional but Recommended)

```sql
-- Run in SQL Editor
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies (example for users table)
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);
```

---

## 5. Step 2: Setup Upstash Redis

### 5.1 Create Redis Database

1. **Go to Upstash Console**
   - Visit: https://console.upstash.com
   - Click "Create Database"

2. **Configure Database**
   ```
   Name: bhindi-saas-redis
   Type: Regional
   Region: (Same as Supabase or closest)
   TLS: Enabled (recommended)
   Eviction: No eviction
   ```

3. **Create Database**
   - Click "Create"
   - Wait for provisioning (30 seconds)

### 5.2 Get Redis Connection String

1. **Click on Database**
   - Select your newly created database

2. **Copy Connection Details**
   - Find "REST API" section
   - Copy "UPSTASH_REDIS_REST_URL"
   - Copy "UPSTASH_REDIS_REST_TOKEN"
   
   OR
   
   - Find "Redis" section
   - Copy "Redis URL" (format: `redis://default:[PASSWORD]@[HOST]:6379`)

---

## 6. Step 3: Deploy Backend to Vercel

### 6.1 Prepare Backend for Vercel

1. **Create vercel.json in backend directory**

```bash
cd backend
cat > vercel.json << 'EOF'
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/index.ts"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
EOF
```

2. **Update package.json**

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "vercel-build": "tsc"
  },
  "engines": {
    "node": "18.x"
  }
}
```

### 6.2 Deploy Backend

**Option A: Via Vercel Dashboard**

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Click "Add New" → "Project"

2. **Import Repository**
   - Select your GitHub repository
   - Click "Import"

3. **Configure Project**
   ```
   Framework Preset: Other
   Root Directory: backend
   Build Command: npm run vercel-build
   Output Directory: (leave empty)
   Install Command: npm install
   ```

4. **Add Environment Variables** (see Step 5)

5. **Deploy**
   - Click "Deploy"
   - Wait 2-5 minutes

**Option B: Via Vercel CLI**

```bash
# Navigate to backend directory
cd backend

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (select your account)
# - Link to existing project? No
# - Project name? bhindi-saas-backend
# - Directory? ./
# - Override settings? No
```

### 6.3 Get Backend URL

After deployment:
- Copy the deployment URL
- Format: `https://bhindi-saas-backend.vercel.app`
- Save this for frontend configuration

---

## 7. Step 4: Deploy Frontend to Vercel

### 7.1 Prepare Frontend for Vercel

1. **Create vercel.json in frontend directory**

```bash
cd frontend
cat > vercel.json << 'EOF'
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/assets/(.*)",
      "dest": "/assets/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
EOF
```

2. **Update package.json**

```json
{
  "scripts": {
    "build": "vite build",
    "vercel-build": "vite build"
  }
}
```

### 7.2 Deploy Frontend

**Option A: Via Vercel Dashboard**

1. **Add New Project**
   - Click "Add New" → "Project"
   - Select same repository

2. **Configure Project**
   ```
   Framework Preset: Vite
   Root Directory: frontend
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

3. **Add Environment Variables** (see Step 5)

4. **Deploy**
   - Click "Deploy"
   - Wait 2-5 minutes

**Option B: Via Vercel CLI**

```bash
# Navigate to frontend directory
cd frontend

# Deploy
vercel --prod

# Follow prompts
```

---

## 8. Step 5: Configure Environment Variables

### 8.1 Backend Environment Variables

**In Vercel Dashboard → Backend Project → Settings → Environment Variables**

Add these variables:

```bash
# Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxx.supabase.co:5432/postgres

# Redis (Option 1: REST API)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXxxx

# Redis (Option 2: Traditional)
REDIS_URL=redis://default:YOUR_PASSWORD@xxx.upstash.io:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-change-this
JWT_EXPIRES_IN=7d

# AI APIs
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxx
GOOGLE_AI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxx

# Server
PORT=3000
NODE_ENV=production

# CORS
CORS_ORIGIN=https://your-frontend.vercel.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Optional: Stripe
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# Optional: Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com

# Optional: Monitoring
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

### 8.2 Frontend Environment Variables

**In Vercel Dashboard → Frontend Project → Settings → Environment Variables**

Add these variables:

```bash
# API Configuration
VITE_API_URL=https://your-backend.vercel.app
VITE_WS_URL=wss://your-backend.vercel.app

# Environment
VITE_ENV=production
VITE_APP_NAME=Bhindi SaaS Clone

# AI Models
VITE_DEFAULT_AI_MODEL=gpt-4-turbo

# Optional: Analytics
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
VITE_GA_TRACKING_ID=G-XXXXXXXXXX
```

### 8.3 Redeploy After Adding Variables

```bash
# Backend
cd backend
vercel --prod

# Frontend
cd frontend
vercel --prod
```

---

## 9. Step 6: Test Deployment

### 9.1 Test Backend

```bash
# Health check
curl https://your-backend.vercel.app/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-12-24T...",
  "database": "connected",
  "redis": "connected"
}
```

### 9.2 Test Frontend

1. **Open Frontend URL**
   - Visit: https://your-frontend.vercel.app
   - Should see login page

2. **Test Registration**
   - Click "Sign Up"
   - Fill in details
   - Submit form
   - Should create account

3. **Test Login**
   - Enter credentials
   - Click "Sign In"
   - Should redirect to dashboard

4. **Test Chat**
   - Navigate to Chat page
   - Send a message
   - Should receive AI response

### 9.3 Check Logs

**Backend Logs:**
```bash
vercel logs https://your-backend.vercel.app
```

**Frontend Logs:**
```bash
vercel logs https://your-frontend.vercel.app
```

---

## 10. Troubleshooting

### Issue 1: Database Connection Error

**Error:** `Connection timeout` or `ECONNREFUSED`

**Solution:**
```bash
# 1. Verify DATABASE_URL format
# Correct format:
postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres?sslmode=require

# 2. Check Supabase connection pooler
# Use connection pooler URL for serverless:
postgresql://postgres:PASSWORD@db.xxx.supabase.co:6543/postgres?pgbouncer=true

# 3. Test connection
psql "postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres" -c "SELECT 1"
```

### Issue 2: Redis Connection Error

**Error:** `Redis connection failed`

**Solution:**
```bash
# Option 1: Use Upstash REST API (recommended for Vercel)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXxxx

# Update backend code to use REST API:
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})
```

### Issue 3: CORS Error

**Error:** `Access to fetch blocked by CORS policy`

**Solution:**
```javascript
// backend/src/index.ts
import cors from 'cors';

app.use(cors({
  origin: [
    'https://your-frontend.vercel.app',
    'https://*.vercel.app', // Allow preview deployments
    'http://localhost:3000' // Local development
  ],
  credentials: true
}));
```

### Issue 4: Environment Variables Not Working

**Error:** `undefined` when accessing variables

**Solution:**
```bash
# 1. Verify variable names
# Frontend: Must start with VITE_
# Backend: No prefix needed

# 2. Redeploy after adding variables
vercel --prod

# 3. Check in Vercel Dashboard
# Settings → Environment Variables
# Make sure "Production" is checked
```

### Issue 5: Build Fails

**Error:** `Build failed` or `Module not found`

**Solution:**
```bash
# 1. Check package.json
# Make sure all dependencies are listed

# 2. Clear cache and rebuild
vercel --prod --force

# 3. Check build logs
vercel logs --follow

# 4. Test build locally
npm run build
```

### Issue 6: WebSocket Connection Fails

**Error:** `WebSocket connection failed`

**Solution:**
```javascript
// Vercel doesn't support WebSocket in serverless functions
// Use polling as fallback:

// frontend/src/lib/socket.ts
import io from 'socket.io-client';

const socket = io(import.meta.env.VITE_WS_URL, {
  transports: ['polling', 'websocket'], // Polling first
  upgrade: true,
  secure: true
});
```

**Alternative:** Use Pusher or Ably for real-time features on Vercel

### Issue 7: Cold Start Delays

**Issue:** First request takes 5-10 seconds

**Solution:**
```bash
# 1. Upgrade to Vercel Pro (faster cold starts)

# 2. Use connection pooling for database
DATABASE_URL=postgresql://...?pgbouncer=true&connection_limit=1

# 3. Implement warming function
# Create a cron job to ping your API every 5 minutes
```

---

## 11. Production Checklist

### Pre-Launch ✅
- [ ] Database schema deployed
- [ ] All environment variables set
- [ ] Backend deployed and tested
- [ ] Frontend deployed and tested
- [ ] CORS configured correctly
- [ ] SSL certificates active
- [ ] Custom domain configured (optional)

### Security ✅
- [ ] JWT_SECRET is strong and unique
- [ ] Database password is strong
- [ ] API keys are not exposed in frontend
- [ ] Rate limiting enabled
- [ ] CORS whitelist configured
- [ ] Row Level Security enabled (Supabase)

### Performance ✅
- [ ] Database connection pooling enabled
- [ ] Redis caching configured
- [ ] CDN enabled (automatic with Vercel)
- [ ] Images optimized
- [ ] Gzip compression enabled (automatic)

### Monitoring ✅
- [ ] Error tracking setup (Sentry)
- [ ] Analytics configured (GA)
- [ ] Uptime monitoring (UptimeRobot)
- [ ] Log aggregation configured

---

## 12. Cost Breakdown

### Free Tier (Development)
- **Vercel**: $0 (Hobby plan)
  - 100 GB bandwidth
  - Unlimited deployments
  - Automatic HTTPS
- **Supabase**: $0 (Free plan)
  - 500 MB database
  - 2 GB bandwidth
  - 50,000 monthly active users
- **Upstash**: $0 (Free plan)
  - 10,000 commands/day
  - 256 MB storage
- **Total**: $0/month

### Production (Recommended)
- **Vercel Pro**: $20/month
  - 1 TB bandwidth
  - Advanced analytics
  - Password protection
- **Supabase Pro**: $25/month
  - 8 GB database
  - 50 GB bandwidth
  - Daily backups
- **Upstash**: $10/month
  - 100K commands/day
  - 1 GB storage
- **AI APIs**: $50-200/month (usage-based)
- **Total**: $105-255/month

---

## 13. Next Steps

### After Deployment
1. **Setup Custom Domain**
   - Add domain in Vercel
   - Configure DNS records
   - Wait for SSL provisioning

2. **Enable Monitoring**
   - Setup Sentry for error tracking
   - Configure Google Analytics
   - Setup uptime monitoring

3. **Optimize Performance**
   - Enable caching
   - Optimize images
   - Implement lazy loading

4. **Scale as Needed**
   - Monitor usage
   - Upgrade plans when needed
   - Add more regions if required

---

## 14. Useful Commands

```bash
# Vercel CLI
vercel login                    # Login
vercel                          # Deploy preview
vercel --prod                   # Deploy production
vercel logs                     # View logs
vercel env ls                   # List env variables
vercel env add VAR_NAME         # Add env variable
vercel domains add example.com  # Add domain
vercel --force                  # Force rebuild

# Database
psql $DATABASE_URL              # Connect to database
psql $DATABASE_URL < schema.sql # Run migrations

# Testing
curl https://your-backend.vercel.app/health
curl https://your-frontend.vercel.app
```

---

## 15. Support Resources

### Documentation
- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Upstash Docs](https://docs.upstash.com)

### Community
- [Vercel Discord](https://vercel.com/discord)
- [Supabase Discord](https://discord.supabase.com)
- [GitHub Issues](https://github.com/itskiranbabu/bhindi-saas-clone/issues)

### Direct Support
- Email: itskeyrun.ai@gmail.com
- GitHub: @itskiranbabu

---

## 🎉 Congratulations!

Your Bhindi SaaS Clone is now live on Vercel with Supabase! 🚀

**Your URLs:**
- Frontend: https://your-frontend.vercel.app
- Backend: https://your-backend.vercel.app
- Database: Supabase Dashboard

**Next:** Share with users and start collecting feedback!

---

*Last Updated: December 24, 2024*  
*Version: 1.0.0*

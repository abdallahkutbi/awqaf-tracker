# Deployment Guide

## Overview

This project consists of two parts:
- **Backend (server/)**: Node.js/Express API deployed on Railway
- **Frontend (web/)**: Next.js application deployed on Vercel

## Railway Setup (Backend)

### 1. Create New Project
1. Go to [Railway](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Set **Root Directory** to `server`

### 2. Environment Variables
Add these environment variables in Railway:
```
NODE_ENV=production
PORT=4000
SQLITE_PATH=/app/data/db.sqlite
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
```

### 3. Volume Setup (Important!)
Railway needs a persistent volume for the SQLite database:
1. Go to your service settings
2. Click on "Volumes"
3. Add a new volume:
   - **Mount Path**: `/app/data`
   - **Size**: 1GB (or more as needed)

### 4. Build Configuration
Railway will automatically detect the `railway.json` file which configures:
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Health check: `/health`

### 5. Get Your API URL
After deployment, Railway will provide a URL like:
`https://your-app-name.up.railway.app`

## Vercel Setup (Frontend)

### 1. Create New Project
1. Go to [Vercel](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Set **Root Directory** to `web`

### 2. Environment Variables
Add this environment variable in Vercel:
```
NEXT_PUBLIC_API_BASE=https://your-railway-app.up.railway.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```
**Important**: Replace `your-railway-app.up.railway.app` with your actual Railway URL from step 1.5 above.

### 3. Build Configuration
Vercel will automatically detect Next.js:
- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install` (auto-detected)

### 4. Deploy
Click "Deploy" and Vercel will build and deploy your frontend.

## Post-Deployment Steps

### 1. Update CORS Settings
After both deployments, update the backend CORS configuration:

In `server/src/index.ts`, the CORS allowed origins should include your Vercel domain:
```typescript
const allowed = new Set([
  "http://localhost:3000",
  "http://localhost:3001",
  "https://your-vercel-app.vercel.app"
]);
```

### 2. Initialize Database
The database will be created automatically on first run, but you may need to seed initial data:
1. SSH into your Railway service (use Railway CLI)
2. Or use the database initialization endpoints

### 3. Test Stripe Integration
1. Use Stripe test cards: `4242 4242 4242 4242`
2. Any future expiry date
3. Any 3-digit CVC

## Monitoring

### Railway (Backend)
- View logs: Railway Dashboard → Your Service → Logs
- Health check: `https://your-railway-app.up.railway.app/health`

### Vercel (Frontend)
- View logs: Vercel Dashboard → Your Project → Deployments
- Runtime logs: Click on a deployment → View Function Logs

## Troubleshooting

### Database Issues on Railway
- Ensure the volume is mounted at `/app/data`
- Check `SQLITE_PATH` environment variable
- Railway's file system is ephemeral except for mounted volumes

### CORS Errors
- Ensure your Vercel URL is in the CORS allowed origins
- Check that `NEXT_PUBLIC_API_BASE` is set correctly in Vercel

### Stripe Errors
- Verify both public and secret keys are set correctly
- Ensure you're using test keys in development
- Check Stripe Dashboard for webhook events

## Local Development

### Backend
```bash
cd server
npm install
npm run dev
```

### Frontend
```bash
cd web
npm install
npm run dev
```

Create a `server/.env` file:
```
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
```

Create a `web/.env.local` file:
```
NEXT_PUBLIC_API_BASE=http://localhost:4000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

## Production Checklist

- [ ] Railway volume is configured for database persistence
- [ ] All environment variables are set in Railway
- [ ] All environment variables are set in Vercel
- [ ] CORS origins include Vercel URL
- [ ] Stripe keys are production keys (when ready for production)
- [ ] Health check endpoint is responding
- [ ] Database is initialized with schema
- [ ] Test a full payment flow end-to-end


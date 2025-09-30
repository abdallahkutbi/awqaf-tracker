# Awqaf Tracker - Deployment Guide

## Step-by-Step Deployment Instructions

### Step 1: Push to GitHub
1. Create a new repository on GitHub
2. Push your code:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/awqaf-tracker.git
git push -u origin main
```

### Step 2: Deploy Backend to Railway

1. **Go to Railway.app** and sign up/login
2. **Click "New Project"** → "Deploy from GitHub repo"
3. **Select your repository** and choose the `server` folder
4. **Railway will auto-detect** your Node.js app
5. **Set Environment Variables:**
   - `FRONTEND_URL` = `https://your-frontend-url.vercel.app` (you'll update this after frontend deployment)
6. **Deploy** - Railway will build and deploy your backend
7. **Copy the Railway URL** (e.g., `https://your-app.railway.app`)

### Step 3: Deploy Frontend to Vercel

1. **Go to Vercel.com** and sign up/login
2. **Click "New Project"** → Import from GitHub
3. **Select your repository** and choose the `web` folder
4. **Set Environment Variables:**
   - `NEXT_PUBLIC_API_BASE_URL` = Your Railway backend URL (e.g., `https://your-app.railway.app`)
5. **Deploy** - Vercel will build and deploy your frontend
6. **Copy the Vercel URL** (e.g., `https://your-app.vercel.app`)

### Step 4: Update Backend CORS

1. **Go back to Railway** → Your backend project
2. **Update Environment Variable:**
   - `FRONTEND_URL` = Your Vercel frontend URL
3. **Redeploy** the backend (Railway will auto-redeploy)

### Step 5: Test Your Deployment

1. **Visit your Vercel URL**
2. **Test the login/signup functionality**
3. **Verify all features work** (dashboard, beneficiaries, payouts, etc.)

## Environment Variables Summary

### Backend (Railway)
- `PORT` (auto-set by Railway)
- `FRONTEND_URL` = Your Vercel frontend URL

### Frontend (Vercel)
- `NEXT_PUBLIC_API_BASE_URL` = Your Railway backend URL

## Troubleshooting

### Common Issues:
1. **CORS errors**: Make sure `FRONTEND_URL` in Railway matches your Vercel URL exactly
2. **API not found**: Check that `NEXT_PUBLIC_API_BASE_URL` in Vercel is correct
3. **Database issues**: SQLite file is automatically persisted on Railway

### URLs to Check:
- Backend health: `https://your-app.railway.app/health`
- Frontend: `https://your-app.vercel.app`

## Cost
- **Railway**: Free tier (500 hours/month)
- **Vercel**: Free tier (unlimited for personal projects)
- **Total**: $0/month for your use case

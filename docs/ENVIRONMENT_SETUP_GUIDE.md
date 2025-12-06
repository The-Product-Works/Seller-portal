# Environment Variables Setup Guide

## File Structure Overview

### `.env` (Git-Ignored - All Variables in One File)
- **Purpose:** Both frontend AND server-side variables
- **Visibility:** Never committed (in `.gitignore`)
- **Prefixes:** 
  - `VITE_` prefix = Frontend (exposed to browser)
  - No prefix = Server-side (Vercel Serverless Functions only)
- **Example:** `VITE_SUPABASE_URL` (frontend), `RESEND_API_KEY` (server)

### `.env.local` (Optional - Backup/Reference)
- **Purpose:** Can be used as backup or kept for reference
- **Note:** Not required since `.env` is git-ignored and contains all variables
- **Status:** Can be deleted if you prefer single `.env` file

---

## ✅ Current Local Development Setup

Only ONE file needed for local development:

| File | Purpose | Used By |
|------|---------|---------|
| `.env` | Frontend + Server vars | Both Vite (8080) & Vercel dev (3000) |

**Run Command:** `npm run dev:full`
- Starts Vite (frontend) on port 8080
- Starts Vercel dev (serverless functions) on port 3000

---

## 🚀 Production Deployment (Vercel Dashboard)

For production, you need to add server-side environment variables to Vercel Dashboard:

### Step-by-Step Instructions

1. **Go to Vercel Dashboard**
   - URL: https://vercel.com/dashboard
   - Navigate to: `theproductworks-projects` → `seller-portal`

2. **Open Settings → Environment Variables**
   - Click "Settings" tab
   - Click "Environment Variables" in sidebar

3. **Add Each Variable Below**

   Click "Add New" for each variable:

   | Variable Name | Value | Environment |
   |---------------|-------|-------------|
   | `RESEND_API_KEY` | `re_*******************` | Production, Preview, Development |
   | `RESEND_FROM_EMAIL` | `support@trupromart.com` | Production, Preview, Development |
   | `RESEND_TESTING_MODE` | `false` | Production |
   | `RESEND_TESTING_MODE` | `true` | Preview, Development |
   | `RESEND_VERIFIED_EMAIL` | `devops-team@theproductworks.in` | Production, Preview, Development |
   | `SUPABASE_URL` | `https://wysxqrhotiggokvbbtqx.supabase.co` | Production, Preview, Development |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...IZLPiM` | Production, Preview, Development |

   **Important Notes:**
   - ✅ **DO NOT** prefix these with `VITE_` (they're server-side only)
   - ✅ Select all three environments: Production, Preview, Development
   - ✅ For `RESEND_TESTING_MODE`:
     - Set `false` for Production (sends real emails)
     - Set `true` for Preview/Development (redirects to devops-team email)

4. **Save and Redeploy**
   - After adding all variables, trigger a new deployment
   - Either: Push a commit to GitHub
   - Or: Go to "Deployments" → Click "..." → "Redeploy"

---

## 🔒 Security Best Practices

### Current Setup (Recommended)
Since `.env` is in `.gitignore`, you can safely store all variables there:

```env
# .env (Git-ignored - Safe for all variables)

# Frontend (VITE_ prefix - exposed to browser)
VITE_SUPABASE_URL=https://wysxqrhotiggokvbbtqx.supabase.co
VITE_ADMIN_EMAIL=devops-team@theproductworks.in

# Server-side (NO prefix - secrets safe because file is git-ignored)
RESEND_API_KEY=re_xxx...
SUPABASE_SERVICE_ROLE_KEY=ey...
```

### ❌ What NOT to Do:
```env
# WRONG - Never prefix server secrets with VITE_
VITE_RESEND_API_KEY=re_xxx...  # ❌ This exposes the key to browser!
VITE_SUPABASE_SERVICE_ROLE_KEY=ey...  # ❌ Major security risk!
```

**Rule:** Server secrets = No `VITE_` prefix (only accessible in serverless functions)

---

## 🧪 Testing the Setup

### Local Testing
1. Ensure `.env` file has both frontend and server variables
2. Run: `npm run dev:full`
3. Open: http://localhost:8080
4. Click "Send Test Email" button on dashboard
5. Check: devops-team@theproductworks.in for test email
6. Verify: Console shows "✅ Email logged to database"

### Production Testing
1. Add all environment variables to Vercel Dashboard
2. Deploy to production
3. Open: https://seller-portal.vercel.app (or your domain)
4. Test email functionality
5. Verify emails are sent correctly

---

## 📋 Quick Reference

### Environment Variable Checklist

**All in `.env` file (git-ignored):**

**Frontend (VITE_ prefix) - 6 variables:**
- [x] `VITE_SUPABASE_PROJECT_ID`
- [x] `VITE_SUPABASE_URL`
- [x] `VITE_SUPABASE_PUBLISHABLE_KEY`
- [x] `VITE_SELLER_SECRET_KEY`
- [x] `VITE_RESEND_FROM_EMAIL`
- [x] `VITE_ADMIN_EMAIL`

**Server (NO prefix) - 6 variables:**
- [x] `RESEND_API_KEY` (local: in .env, prod: add to Vercel Dashboard)
- [x] `RESEND_FROM_EMAIL` (local: in .env, prod: add to Vercel Dashboard)
- [x] `RESEND_TESTING_MODE` (local: in .env, prod: add to Vercel Dashboard)
- [x] `RESEND_VERIFIED_EMAIL` (local: in .env, prod: add to Vercel Dashboard)
- [x] `SUPABASE_URL` (local: in .env, prod: add to Vercel Dashboard)
- [x] `SUPABASE_SERVICE_ROLE_KEY` (local: in .env, prod: add to Vercel Dashboard)

---

## 🔄 Next Steps

After setting up environment variables in Vercel Dashboard:

1. ✅ **Complete** - Local development working
2. ⏭️ **Next** - Add environment variables to Vercel Dashboard
3. ⏭️ **Next** - Implement email templates (per `RESEND_EMAIL_IMPLEMENTATION.md`)
4. ⏭️ **Next** - Add email triggers for seller notifications
5. ⏭️ **Next** - Test production deployment

---

## 📞 Support

If you encounter issues:
- Check `.env.local` has correct values (for local dev)
- Verify Vercel Dashboard has all variables (for production)
- Ensure no `VITE_` prefix on server-side variables
- Check serverless function logs in Vercel Dashboard → Logs

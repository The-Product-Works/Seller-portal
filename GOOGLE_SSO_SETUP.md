# Google SSO Setup Guide

## ✅ What's Implemented

Google OAuth (SSO) buttons have been added to:
- **Sign In page** (`/auth/signin`) - "Continue with Google" button
- **Sign Up page** (`/auth/signup`) - "Continue with Google" button

## 🔧 Configure Google OAuth in Supabase

### Step 1: Get Your Google OAuth Credentials

Your Google Client ID is: `910309705245-55gn6261foph4sd39fj1bs2r7nhr5fch.apps.googleusercontent.com`

You need the **Client Secret** as well. Get it from:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID
5. Click on it and copy the **Client Secret**

### Step 2: Configure Supabase

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **Authentication** → **Providers** (left sidebar)
4. Find **Google** in the list
5. Toggle it **ON**
6. Fill in the credentials:
   - **Client ID**: `910309705245-55gn6261foph4sd39fj1bs2r7nhr5fch.apps.googleusercontent.com`
   - **Client Secret**: [Paste your secret here from Google Cloud Console]
7. Click **Save**

### Step 3: Configure Google OAuth Redirect URIs

1. Go back to [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   ```
   https://[YOUR-SUPABASE-PROJECT-REF].supabase.co/auth/v1/callback
   ```
   Replace `[YOUR-SUPABASE-PROJECT-REF]` with your actual Supabase project reference
   
   Example: `https://wysxqrhotiggokvbbtqx.supabase.co/auth/v1/callback`

5. Also add for local development:
   ```
   http://localhost:54321/auth/v1/callback
   ```

6. Click **Save**

### Step 4: Test Google SSO

1. Start your development server:
   ```powershell
   npm run dev
   ```

2. Go to http://localhost:8080/auth/signin

3. Click **"Continue with Google"**

4. You should be redirected to Google login

5. After successful login, you'll be redirected back to your app at `/landing`

## 🎯 How It Works

### Sign In Flow:
1. User clicks "Continue with Google"
2. Redirected to Google OAuth consent screen
3. User approves
4. Google redirects back to Supabase callback URL
5. Supabase creates/updates user session
6. User redirected to `/landing` page

### Sign Up Flow:
1. User clicks "Continue with Google"
2. Same OAuth flow as sign-in
3. If new user, Supabase creates account automatically
4. User redirected to `/kyc` page to complete KYC verification
5. Seller record is created via database triggers

## 🔐 Security Notes

- **Never share your Client Secret publicly**
- Client Secret should only be stored in Supabase Dashboard (Environment Variables)
- The secret is used server-side by Supabase, never exposed to the browser
- OAuth flow uses secure PKCE (Proof Key for Code Exchange)

## 📧 Email Notifications with Resend

For email notifications, you've already set up the Edge Function. Here's the summary:

### Resend API Key
Your Resend API key: `re_gGkm2o8x_2u1NbhbadCNmcCNSTCGzvD7X`

### Setup Steps:
1. Edge Function is deployed at: `send-email`
2. Set environment secrets in Supabase Dashboard → Edge Functions → Settings:
   - `RESEND_API_KEY` = `re_gGkm2o8x_2u1NbhbadCNmcCNSTCGzvD7X`
   - `RESEND_FROM_EMAIL` = `onboarding@resend.dev` (or your verified domain)

3. Edge Function handles CORS automatically
4. Call from frontend:
   ```typescript
   const { data, error } = await supabase.functions.invoke('send-email', {
     body: {
       recipientEmail: 'user@example.com',
       subject: 'Test Email',
       htmlContent: '<h1>Hello!</h1>'
     }
   });
   ```

## 🐛 Troubleshooting

### Google SSO Not Working?

**Check 1: Redirect URIs**
- Make sure the redirect URI in Google Console matches your Supabase project URL exactly
- Include `/auth/v1/callback` at the end

**Check 2: Client Secret**
- Verify the Client Secret is correctly entered in Supabase Dashboard
- No extra spaces or characters

**Check 3: OAuth Consent Screen**
- Make sure your OAuth consent screen is configured in Google Cloud Console
- Add test users if your app is in "Testing" mode

**Check 4: Browser Console**
- Open browser DevTools (F12)
- Check for any errors during OAuth redirect

### Email Notifications Not Working?

**Check 1: Edge Function Deployed**
- Verify function is deployed: `supabase functions list`
- Check function logs in Supabase Dashboard

**Check 2: Environment Secrets**
- Verify `RESEND_API_KEY` is set in Edge Functions settings
- Verify `RESEND_FROM_EMAIL` is set

**Check 3: Resend API Key Valid**
- Test API key at https://resend.com/api-keys
- Make sure key has proper permissions

## ✅ Verification Checklist

- [ ] Google OAuth Client ID configured in Supabase
- [ ] Google OAuth Client Secret configured in Supabase
- [ ] Redirect URI added to Google Cloud Console
- [ ] Google provider enabled in Supabase Authentication settings
- [ ] Tested "Continue with Google" on sign-in page
- [ ] Tested "Continue with Google" on sign-up page
- [ ] Resend API key added to Edge Function secrets
- [ ] Edge Function `send-email` deployed
- [ ] Tested email sending from `/test-notifications`

## 📝 Notes

- **Google SSO** = User authentication (login/signup)
- **Resend** = Email notifications (alerts, updates)
- These are **separate systems** with different purposes
- Both work together to provide complete user experience

## 🎉 All Set!

Once configured, users can:
1. ✅ Sign in with Google (instant authentication)
2. ✅ Sign up with Google (auto-creates seller account)
3. ✅ Receive email notifications (stock alerts, payouts, etc.)
4. ✅ Complete KYC after Google signup

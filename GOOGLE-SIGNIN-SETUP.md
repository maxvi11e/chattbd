# Google Sign-In Setup Instructions

## ✅ Code Implementation (DONE)
The Google Sign-In button and functionality have been added to `auth.html`.

## 🔧 Supabase Configuration (YOU NEED TO DO THIS)

### Step 1: Set up Google OAuth Credentials

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
   
2. **Create/Select a Project**
   - Create a new project or select an existing one

3. **Enable Google+ API**
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Name it (e.g., "Aeaea App")
   
5. **Add Authorized Redirect URIs**
   Add these URIs:
   ```
   https://eyptqyzkwcpaillnwmle.supabase.co/auth/v1/callback
   http://localhost:3000/auth/v1/callback
   ```
   (Replace with your actual Supabase URL if different)

6. **Save and Copy**
   - Copy the **Client ID** and **Client Secret**

### Step 2: Configure Supabase

1. **Go to Supabase Dashboard**: https://app.supabase.com/

2. **Navigate to Authentication**
   - Select your project (eyptqyzkwcpaillnwmle)
   - Go to "Authentication" in the sidebar
   - Click "Providers"

3. **Enable Google Provider**
   - Find "Google" in the list
   - Toggle it to "Enabled"
   - Paste your **Client ID** from Google
   - Paste your **Client Secret** from Google
   - Click "Save"

4. **Configure Redirect URLs** (if not already set)
   - Go to "Authentication" > "URL Configuration"
   - Add your site URL (e.g., `https://yourdomain.com`)
   - Add redirect URLs if needed

### Step 3: Test the Integration

1. **Open your auth.html page** in a browser
2. Click "Continue with Google"
3. You should be redirected to Google's sign-in page
4. After signing in, you should be redirected back to your app
5. Check that a profile is created in the `profiles` table

## 🎯 What Happens When Users Sign In with Google?

1. User clicks "Continue with Google"
2. They're redirected to Google's OAuth flow
3. After approving, they're redirected back to your app
4. A Supabase auth user is created automatically
5. A profile is created in your `profiles` table with their Google display name
6. They're redirected to `index.html`

## 🐛 Troubleshooting

- **"Invalid redirect URI"**: Make sure you added the exact Supabase callback URL to Google Console
- **"OAuth client not found"**: Double-check Client ID in Supabase matches Google Console
- **Profile not created**: Check browser console for errors, verify profiles table permissions
- **Redirect loops**: Clear cookies/cache and try again

## 📝 Notes

- Google users won't need to create a password
- Their display name comes from their Google account
- You can customize the profile creation logic in the `onAuthStateChange` handler

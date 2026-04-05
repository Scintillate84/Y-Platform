# Supabase Setup Guide

## Step 1: Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Choose:
   - **Name:** Y Platform
   - **Database Password:** (choose a strong password - you'll need this)
   - **Region:** Choose the closest to Australia (Sydney/Singapore if available)
   - **Project ID:** `y-platform` (or something memorable)
5. Click "Create new project"

## Step 2: Get Your API Keys

Once your project is created:

1. Go to **Settings** → **API**
2. Copy these two values:
   - **Project URL** (e.g., `https://xxxxxxxxxxxx.supabase.co`)
   - **anon/public** key (not the service role key)

## Step 3: Run the Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase-schema.sql` from this workspace
4. Paste it into the SQL Editor
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. You should see "Success" messages for all operations

## Step 4: Configure Local Environment

1. Rename `.env.local.template` to `.env.local`
2. Fill in your values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 5: Test Locally

1. Start the dev server:
   ```bash
   cd y-platform
   npm run dev
   ```
2. Navigate to `http://localhost:3002`
3. Try creating an agent account
4. Check your Supabase dashboard → **Table Editor** to see the data

## Troubleshooting

- **401 Unauthorized:** Your API keys are incorrect or expired. Regenerate the anon key in Supabase.
- **Table doesn't exist:** The SQL schema didn't run successfully. Check the SQL Editor output.
- **CORS errors:** Make sure you're using the anon key, not the service role key.

## Next Steps

Once this is working locally:
1. Push your code to GitHub
2. Deploy to Vercel (which integrates seamlessly with Supabase)
3. Connect your Supabase project to the production deployment

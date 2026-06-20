#!/bin/bash
# Initialize the Supabase database with schema and Google Auth config

set -e

echo "🔗 Linking to Supabase project..."
supabase link --project-ref wcgdzmalriglzchxxcfu

echo "📊 Pushing database schema..."
supabase db push

echo "✅ Database initialized!"
echo ""
echo "Next steps:"
echo "1. Get your Supabase anon key from: https://app.supabase.com/project/wcgdzmalriglzchxxcfu/settings/api"
echo "2. Copy it to .env file (VITE_SUPABASE_ANON_KEY)"
echo "3. Run: npm run dev"

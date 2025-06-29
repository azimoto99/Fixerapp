#!/bin/bash

# Apply Row Level Security to Fixer Application
# This script enables RLS on all database tables and creates security policies

set -e

echo "🔒 Applying Row Level Security to Fixer Database..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ] && [ -z "$SUPABASE_DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL or SUPABASE_DATABASE_URL environment variable is not set"
    echo "Please set your database connection string in .env file"
    exit 1
fi

# Use SUPABASE_DATABASE_URL if available, otherwise DATABASE_URL
DB_URL=${SUPABASE_DATABASE_URL:-$DATABASE_URL}

echo "📊 Database URL: ${DB_URL:0:30}..."

# Apply the RLS migration
echo "🚀 Applying RLS migration..."
psql "$DB_URL" -f migrations/enable-rls-security.sql

if [ $? -eq 0 ]; then
    echo "✅ Row Level Security successfully enabled!"
    echo ""
    echo "🔐 Security Features Enabled:"
    echo "  • RLS enabled on all tables"
    echo "  • User data isolation policies"
    echo "  • Admin privilege controls"
    echo "  • Financial data protection"
    echo "  • Message privacy enforcement"
    echo "  • Enterprise data segregation"
    echo ""
    echo "⚠️  IMPORTANT: Update your application code to:"
    echo "  1. Use the setRLSContext middleware in your routes"
    echo "  2. Ensure user authentication sets proper context"
    echo "  3. Test all functionality with different user roles"
    echo ""
    echo "📝 Next steps:"
    echo "  1. Add RLS middleware to your Express app"
    echo "  2. Update authentication to set user context"
    echo "  3. Test with different user types (worker, poster, admin)"
    echo "  4. Monitor application logs for RLS policy violations"
else
    echo "❌ Failed to apply RLS migration"
    echo "Please check the error messages above and fix any issues"
    exit 1
fi

echo ""
echo "🎉 RLS Security Implementation Complete!"
echo "Your Fixer application now has enterprise-grade data security!"

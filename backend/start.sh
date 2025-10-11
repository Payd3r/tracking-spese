#!/bin/sh

echo "🚀 Starting Tracking Spese Backend..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
until node -e "
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.query('SELECT 1').then(() => {
    console.log('✅ Database connected');
    process.exit(0);
  }).catch(() => {
    console.log('❌ Database not ready, retrying...');
    process.exit(1);
  });
" 2>/dev/null; do
  sleep 2;
done

# Run migrations
echo "📊 Running database migrations..."
npm run migrate

# Start the application
echo "🎯 Starting server..."
exec npm start

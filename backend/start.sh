#!/bin/sh

echo "🚀 Starting Tracking Spese Backend..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
echo "🔗 DATABASE_URL: $DATABASE_URL"

until node -e "
  const { Pool } = require('pg');
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });
  pool.query('SELECT 1').then(() => {
    console.log('✅ Database connected');
    process.exit(0);
  }).catch((err) => {
    console.log('❌ Database not ready:', err.message);
    process.exit(1);
  });
" 2>/dev/null; do
  echo "⏳ Retrying database connection in 2 seconds..."
  sleep 2;
done

# Run migrations
echo "📊 Running database migrations..."
npm run migrate

# Start the application
echo "🎯 Starting server..."
exec npm start

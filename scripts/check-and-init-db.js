const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function checkAndInit() {
  // First connect to default postgres database to check/create our database
  const defaultUrl = process.env.DATABASE_URL.replace(/\/[^/]+$/, '/postgres');
  
  const client = new Client({
    connectionString: defaultUrl,
  });

  try {
    console.log('Connecting to PostgreSQL (default database)...');
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Check if tracksee_db exists
    const dbName = process.env.DATABASE_URL.split('/').pop();
    console.log(`Checking if database "${dbName}" exists...`);
    
    const res = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (res.rows.length === 0) {
      console.log(`Database "${dbName}" does not exist. Creating...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database "${dbName}" created successfully!`);
    } else {
      console.log(`✅ Database "${dbName}" already exists.`);
    }

    await client.end();

    // Now run the initialization script
    console.log('\nRunning database schema initialization...');
    const { execSync } = require('child_process');
    execSync('node scripts/init-db.js', { stdio: 'inherit' });

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkAndInit();

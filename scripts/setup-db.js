const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function setupDatabase() {
  // Connect as postgres superuser (default local authentication)
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'postgres', // Try common default
    port: 5432,
  });

  try {
    console.log('Connecting to PostgreSQL as postgres user...');
    await client.connect();
    console.log('✅ Connected as postgres');

    const dbName = 'tracksee_db';
    const userName = 'tracksee_user';
    const userPassword = 'tracksee_password';

    // Check if user exists
    console.log(`Checking if user "${userName}" exists...`);
    const userRes = await client.query(
      'SELECT 1 FROM pg_roles WHERE rolname = $1',
      [userName]
    );

    if (userRes.rows.length === 0) {
      console.log(`User "${userName}" does not exist. Creating...`);
      await client.query(
        `CREATE USER ${userName} WITH PASSWORD '${userPassword}'`
      );
      console.log(`✅ User "${userName}" created.`);
    } else {
      console.log(`✅ User "${userName}" already exists.`);
    }

    // Check if database exists
    console.log(`Checking if database "${dbName}" exists...`);
    const dbRes = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (dbRes.rows.length === 0) {
      console.log(`Database "${dbName}" does not exist. Creating...`);
      await client.query(
        `CREATE DATABASE ${dbName} OWNER ${userName}`
      );
      console.log(`✅ Database "${dbName}" created.`);
    } else {
      console.log(`✅ Database "${dbName}" already exists.`);
    }

    // Grant privileges
    console.log('Granting privileges...');
    await client.query(`GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${userName}`);
    console.log('✅ Privileges granted.');

    await client.end();

    console.log('\n✅ Database setup complete!');
    console.log(`\nNow run: node scripts/init-db.js`);
    console.log(`DATABASE_URL: postgresql://${userName}:${userPassword}@localhost:5432/${dbName}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure PostgreSQL is running');
    console.error('2. Check if postgres user has a different password');
    console.error('3. Check pg_hba.conf for authentication method');
    process.exit(1);
  }
}

setupDatabase();

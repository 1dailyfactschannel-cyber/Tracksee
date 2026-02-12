const { Client } = require('pg');
require('dotenv').config();

async function updateDb() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    console.log('Adding session_id to events table...');
    await client.query(`
      ALTER TABLE events 
      ADD COLUMN IF NOT EXISTS session_id TEXT;
    `);
    
    console.log('✅ Database schema updated successfully!');
  } catch (err) {
    console.error('❌ Error updating database:', err);
  } finally {
    await client.end();
  }
}

updateDb();

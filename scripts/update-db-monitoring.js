const { Client } = require('pg');
require('dotenv').config();

async function updateDb() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    console.log('Adding project_id and refresh_interval to monitoring_dashboards...');
    await client.query(`
      ALTER TABLE monitoring_dashboards 
      ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS refresh_interval INTEGER DEFAULT 30;
    `);
    
    console.log('✅ Database schema updated successfully!');
  } catch (err) {
    console.error('❌ Error updating database:', err);
  } finally {
    await client.end();
  }
}

updateDb();

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function initDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString: connectionString,
  });

  try {
    console.log(`Connecting to database...`);
    await client.connect();
    console.log('✅ Connected successfully!');

    const sqlPath = path.join(__dirname, '../init-db.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing init-db.sql...');
    await client.query(sql);
    console.log('✅ Database schema initialized successfully!');

    // Verify tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables created:', res.rows.map(r => r.table_name).join(', '));

  } catch (err) {
    console.error('❌ Error initializing database:');
    console.error('Code:', err.code);
    console.error('Message:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
  } finally {
    await client.end();
  }
}

initDb();

const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testConnection(connStr, label) {
  console.log(`\nTesting ${label}: ${connStr}`);
  const client = new Client({
    connectionString: connStr,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    console.log(`✅ ${label}: Connected successfully!`);
    
    const res = await client.query('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\'');
    console.log(`${label}: Tables found: ${res.rows.length}`);
    res.rows.forEach(row => console.log(' - ' + row.table_name));
    
    await client.end();
    return true;
  } catch (err) {
    console.error(`❌ ${label}: Connection failed:`);
    console.error('Error Code:', err.code);
    console.error('Error Message:', err.message);
    console.error('Error Detail:', err.detail);
    return false;
  }
}

async function runTests() {
  const remoteUrl = process.env.DATABASE_URL;
  const localUrl = remoteUrl.replace('89.208.14.253', 'localhost');
  
  await testConnection(remoteUrl, 'REMOTE');
  await testConnection(localUrl, 'LOCAL');
}

runTests();

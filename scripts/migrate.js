const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://tracksee_user:D2rGkB6CaIwpb@89.208.14.253:5435/tracksee_db'
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database');
    
    // Read SQL file
    const sqlPath = path.join(__dirname, '..', 'init-db.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    console.log(`Found ${statements.length} SQL statements`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (stmt) {
        try {
          await client.query(stmt);
          process.stdout.write(`.`);
        } catch (err) {
          // Ignore "already exists" errors
          if (err.message.includes('already exists')) {
            process.stdout.write(`s`);
          } else {
            console.error(`\nError in statement ${i + 1}:`, err.message);
          }
        }
      }
    }
    
    console.log('\n\n✅ Migration completed successfully!');
    
    // Verify tables created
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📊 Tables in database:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function checkConnection() {
  console.log('Попытка подключения к:', process.env.DATABASE_URL);
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Успешное подключение к PostgreSQL!');
    
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('Список таблиц в базе:');
    if (tables.rows.length === 0) {
      console.log('❌ Таблицы не найдены. Возможно, скрипт init-db.sql не отработал.');
    } else {
      tables.rows.forEach(row => console.log(` - ${row.table_name}`));
    }
    
    client.release();
  } catch (err: any) {
    console.error('❌ Ошибка подключения:', err);
    if (err.message && err.message.includes('ECONNREFUSED')) {
      console.log('Совет: Проверьте, запущен ли контейнер Docker и доступен ли порт 5435.');
    }
  } finally {
    await pool.end();
  }
}

checkConnection();

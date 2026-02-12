import { Client } from 'pg'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const databaseUrl = process.env.DATABASE_URL

async function createPointFlowProject() {
  const client = new Client({
    connectionString: databaseUrl,
  })

  try {
    await client.connect()

    const userResult = await client.query('SELECT id FROM users LIMIT 1')
    
    if (userResult.rows.length === 0) {
      console.error("No users found")
      return
    }

    const userId = userResult.rows[0].id

    const result = await client.query(
      'INSERT INTO projects (name, url, user_id) VALUES ($1, $2, $3) RETURNING *',
      ["PointFlow", "https://pointflow.m4bank.ru/", userId]
    )

    console.log("Project PointFlow created successfully:", result.rows[0])
  } catch (error) {
    console.error("Error creating project:", error)
  } finally {
    await client.end()
  }
}

createPointFlowProject()

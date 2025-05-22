import { migrate } from 'postgres-migrations'
import { Pool } from 'pg'

async function runMigrations() {
  const dbConfig = {
    user: 'postgres',
    host: 'localhost',
    database: 'watchTest',
    password: 'postgres',
    port: 5432,
  }

  const pool = new Pool(dbConfig)
  const client = await pool.connect()
  try {
    await migrate({ client }, './migrations')
  } finally {
    client.release()
    await pool.end()
  }
}

runMigrations()
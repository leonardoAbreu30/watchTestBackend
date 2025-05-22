import { Pool } from 'pg'

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'watchTest',
  password: 'postgres',
  port: 5432,
})

export const query = (text: string, params?: any[]) => pool.query(text, params)
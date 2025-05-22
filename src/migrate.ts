import { migrate } from 'postgres-migrations'
import { Pool } from 'pg'
import path from 'path'
import 'dotenv/config'

const runMigrations = async () => {
    const pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432'),
    })

    const client = await pool.connect()

    try {
        console.log('Running migrations...')
        const migrationsPath = path.resolve(__dirname, '../migrations')
        await migrate({ client }, migrationsPath)
        console.log('Migrations completed successfully')
    } catch (err) {
        console.error('Migration failed:', err)
        throw err
    } finally {
        await client.release()
        await pool.end()
    }
}

runMigrations().catch((err) => {
    console.error('Migration script failed:', err)
    process.exit(1)
})
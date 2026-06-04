import fs from 'fs'
import path from 'path'
import { Pool } from 'pg'
import { env } from '@shared/env'
import logger from '@shared/logger'

async function migrate(): Promise<void> {
  const pool = new Pool({ connectionString: env.DATABASE_URL })
  const client = await pool.connect()

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `)

    const migrationsDir = path.join(__dirname, '../../../migrations')
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort()

    for (const file of files) {
      const { rowCount } = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [file]
      )

      if (rowCount && rowCount > 0) {
        logger.info('Migration already applied, skipping', { file })
        continue
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')

      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        )
        await client.query('COMMIT')
        logger.info('Migration applied', { file })
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      }
    }

    logger.info('All migrations complete')
  } finally {
    client.release()
    await pool.end()
  }
}

migrate().catch((err) => {
  logger.error('Migration failed', { error: err })
  process.exit(1)
})

import { Pool } from 'pg'
import { env } from '@shared/env'

export const db = new Pool({ connectionString: env.DATABASE_URL })

import { Pool } from 'pg'
import { IUserRepository } from '@domain/repositories/user.repository'
import { User } from '@domain/entities/user.entity'

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    emailVerifiedAt: row.email_verified_at as Date | null,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  }
}

export class UserRepositoryImpl implements IUserRepository {
  constructor(private readonly pool: Pool) {}

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email]
    )
    return rows[0] ? rowToUser(rows[0]) : null
  }

  async upsertByEmail(email: string): Promise<{ user: User; isNew: boolean }> {
    const { rows } = await this.pool.query(
      `INSERT INTO users (email, email_verified_at)
       VALUES ($1, NOW())
       ON CONFLICT (email) DO UPDATE
         SET email_verified_at = COALESCE(users.email_verified_at, NOW()),
             updated_at = NOW()
       RETURNING *, (xmax::text = '0') AS is_new`,
      [email]
    )
    return {
      user: rowToUser(rows[0]),
      isNew: rows[0].is_new as boolean,
    }
  }

  async findById(id: string): Promise<User | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM users WHERE id = $1 LIMIT 1',
      [id]
    )
    return rows[0] ? rowToUser(rows[0]) : null
  }
}

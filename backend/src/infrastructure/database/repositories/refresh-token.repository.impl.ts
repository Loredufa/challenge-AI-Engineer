import { Pool } from 'pg'
import { IRefreshTokenRepository } from '@domain/repositories/refresh-token.repository'
import { RefreshToken } from '@domain/entities/refresh-token.entity'

function rowToRefreshToken(row: Record<string, unknown>): RefreshToken {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    tokenHash: row.token_hash as string,
    expiresAt: row.expires_at as Date,
    revokedAt: row.revoked_at as Date | null,
    createdAt: row.created_at as Date,
  }
}

export class RefreshTokenRepositoryImpl implements IRefreshTokenRepository {
  constructor(private readonly pool: Pool) {}

  async create(data: {
    userId: string
    tokenHash: string
    expiresAt: Date
  }): Promise<RefreshToken> {
    const { rows } = await this.pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.userId, data.tokenHash, data.expiresAt]
    )
    return rowToRefreshToken(rows[0])
  }

  async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = $1 LIMIT 1',
      [tokenHash]
    )
    return rows[0] ? rowToRefreshToken(rows[0]) : null
  }

  async revoke(id: string): Promise<void> {
    await this.pool.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1',
      [id]
    )
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.pool.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [userId]
    )
  }
}

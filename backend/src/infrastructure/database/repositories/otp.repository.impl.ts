import { Pool } from 'pg'
import { IOTPRepository } from '@domain/repositories/otp.repository'
import { OTPCode } from '@domain/entities/otp.entity'

function rowToOTP(row: Record<string, unknown>): OTPCode {
  return {
    id: row.id as string,
    email: row.email as string,
    otpHash: row.otp_hash as string,
    expiresAt: row.expires_at as Date,
    usedAt: row.used_at as Date | null,
    failedAttempts: row.failed_attempts as number,
    ipAddress: row.ip_address as string | null,
    createdAt: row.created_at as Date,
  }
}

export class OTPRepositoryImpl implements IOTPRepository {
  constructor(private readonly pool: Pool) {}

  async create(data: {
    email: string
    otpHash: string
    expiresAt: Date
    ipAddress?: string
  }): Promise<OTPCode> {
    const { rows } = await this.pool.query(
      `INSERT INTO otp_codes (email, otp_hash, expires_at, ip_address)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.email, data.otpHash, data.expiresAt, data.ipAddress ?? null]
    )
    return rowToOTP(rows[0])
  }

  async findActive(email: string): Promise<OTPCode | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM otp_codes
       WHERE email = $1
         AND used_at IS NULL
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    )
    return rows[0] ? rowToOTP(rows[0]) : null
  }

  async markUsed(id: string): Promise<void> {
    await this.pool.query(
      'UPDATE otp_codes SET used_at = NOW() WHERE id = $1',
      [id]
    )
  }

  async incrementAttempts(id: string): Promise<number> {
    const { rows } = await this.pool.query(
      `UPDATE otp_codes
       SET failed_attempts = failed_attempts + 1
       WHERE id = $1
       RETURNING failed_attempts`,
      [id]
    )
    return rows[0].failed_attempts as number
  }

  async countRecentByEmail(email: string, windowMs: number): Promise<number> {
    const windowStart = new Date(Date.now() - windowMs)
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM otp_codes
       WHERE email = $1
         AND created_at > $2`,
      [email, windowStart]
    )
    return rows[0].cnt as number
  }
}

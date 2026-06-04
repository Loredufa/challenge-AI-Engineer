import { RefreshToken } from '@domain/entities/refresh-token.entity'

export interface IRefreshTokenRepository {
  create(data: {
    userId: string
    tokenHash: string
    expiresAt: Date
  }): Promise<RefreshToken>
  findByHash(tokenHash: string): Promise<RefreshToken | null>
  revoke(id: string): Promise<void>
  revokeAllForUser(userId: string): Promise<void>
}

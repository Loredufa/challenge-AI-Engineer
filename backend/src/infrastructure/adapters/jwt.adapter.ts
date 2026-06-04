import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { env } from '@shared/env'
import { UnauthorizedError } from '@shared/errors'

export class JWTAdapter {
  sign(payload: { sub: string; email: string }, expiresIn: string): string {
    return jwt.sign(payload, env.JWT_PRIVATE_KEY, {
      algorithm: 'RS256',
      expiresIn,
      jwtid: crypto.randomUUID(),
    } as jwt.SignOptions)
  }

  verify(token: string): { sub: string; email: string; jti: string } {
    try {
      const decoded = jwt.verify(token, env.JWT_PUBLIC_KEY, {
        algorithms: ['RS256'],
      }) as { sub: string; email: string; jti: string }
      return decoded
    } catch {
      throw new UnauthorizedError('Invalid or expired token.')
    }
  }

  generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
  }
}

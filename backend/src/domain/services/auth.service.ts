import { IUserRepository } from '@domain/repositories/user.repository'
import { IOTPRepository } from '@domain/repositories/otp.repository'
import { IRefreshTokenRepository } from '@domain/repositories/refresh-token.repository'
import { IEmailProvider } from '@domain/ports/email-provider.port'
import { OTPService } from '@domain/services/otp.service'
import { AuditService } from '@domain/services/audit.service'
import { UnauthorizedError, RateLimitError } from '@shared/errors'

const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes
const OTP_MAX_ATTEMPTS = 5
const OTP_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const OTP_RATE_LIMIT_MAX = 5
const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface IJWTAdapter {
  sign(payload: { sub: string; email: string }, expiresIn: string): string
  verify(token: string): { sub: string; email: string; jti: string }
  generateRefreshToken(): string
  hashToken(token: string): string
}

export class AuthService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly otpRepo: IOTPRepository,
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly jwtAdapter: IJWTAdapter,
    private readonly emailProvider: IEmailProvider,
    private readonly auditService?: AuditService,
  ) {}

  async requestOTP(
    email: string,
    ipAddress?: string,
    auditContext?: { correlationId: string; requestId: string }
  ): Promise<void> {
    const recentCount = await this.otpRepo.countRecentByEmail(
      email,
      OTP_RATE_LIMIT_WINDOW_MS
    )
    if (recentCount >= OTP_RATE_LIMIT_MAX) {
      throw new RateLimitError('Too many OTP requests. Please try again later.')
    }

    const otp = OTPService.generate()
    const otpHash = await OTPService.hash(otp)
    const expiresAt = new Date(Date.now() + OTP_TTL_MS)

    await this.otpRepo.create({ email, otpHash, expiresAt, ipAddress })
    await this.emailProvider.sendOTP(email, otp)

    if (this.auditService && auditContext) {
      this.auditService.emit('OTP_REQUESTED', {
        correlationId: auditContext.correlationId,
        requestId: auditContext.requestId,
        payload: { email },
      })
    }
  }

  async verifyOTP(
    email: string,
    otp: string,
    auditContext?: { correlationId: string; requestId: string }
  ): Promise<TokenPair> {
    const otpRecord = await this.otpRepo.findActive(email)
    if (!otpRecord) {
      throw new UnauthorizedError('No active OTP found for this email.')
    }

    if (OTPService.isExpired(otpRecord.expiresAt)) {
      throw new UnauthorizedError('OTP has expired.')
    }

    if (OTPService.isLocked(otpRecord.failedAttempts, OTP_MAX_ATTEMPTS)) {
      throw new UnauthorizedError('OTP is locked due to too many failed attempts.')
    }

    const valid = await OTPService.verify(otp, otpRecord.otpHash)
    if (!valid) {
      await this.otpRepo.incrementAttempts(otpRecord.id)
      throw new UnauthorizedError('Invalid OTP.')
    }

    await this.otpRepo.markUsed(otpRecord.id)
    const { user, isNew } = await this.userRepo.upsertByEmail(email)

    if (this.auditService && auditContext) {
      if (isNew) {
        this.auditService.emit('USER_CREATED', {
          correlationId: auditContext.correlationId,
          requestId: auditContext.requestId,
          userId: user.id,
          payload: { email },
        })
      }
      this.auditService.emit('OTP_VERIFIED', {
        correlationId: auditContext.correlationId,
        requestId: auditContext.requestId,
        userId: user.id,
        payload: { email },
      })
    }

    const tokens = await this._issueTokens(user.id, user.email)

    if (this.auditService && auditContext) {
      this.auditService.emit('USER_AUTHENTICATED', {
        correlationId: auditContext.correlationId,
        requestId: auditContext.requestId,
        userId: user.id,
        payload: { email },
      })
    }

    return tokens
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const tokenHash = this.jwtAdapter.hashToken(refreshToken)
    const stored = await this.refreshTokenRepo.findByHash(tokenHash)

    if (!stored || stored.revokedAt !== null || new Date() > stored.expiresAt) {
      throw new UnauthorizedError('Invalid or expired refresh token.')
    }

    await this.refreshTokenRepo.revoke(stored.id)

    const user = await this.userRepo.findById(stored.userId)
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive.')
    }

    return this._issueTokens(user.id, user.email)
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.jwtAdapter.hashToken(refreshToken)
    const stored = await this.refreshTokenRepo.findByHash(tokenHash)
    if (stored) {
      await this.refreshTokenRepo.revoke(stored.id)
    }
  }

  private async _issueTokens(userId: string, email: string): Promise<TokenPair> {
    const accessToken = this.jwtAdapter.sign({ sub: userId, email }, ACCESS_TOKEN_TTL)

    const rawRefreshToken = this.jwtAdapter.generateRefreshToken()
    const tokenHash = this.jwtAdapter.hashToken(rawRefreshToken)
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)

    await this.refreshTokenRepo.create({ userId, tokenHash, expiresAt })

    return { accessToken, refreshToken: rawRefreshToken }
  }
}

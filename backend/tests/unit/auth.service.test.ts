import { AuthService } from '../../src/domain/services/auth.service'
import { IUserRepository } from '../../src/domain/repositories/user.repository'
import { IOTPRepository } from '../../src/domain/repositories/otp.repository'
import { IRefreshTokenRepository } from '../../src/domain/repositories/refresh-token.repository'
import { IEmailProvider } from '../../src/domain/ports/email-provider.port'
import { IJWTAdapter } from '../../src/domain/services/auth.service'
import { User } from '../../src/domain/entities/user.entity'
import { OTPCode } from '../../src/domain/entities/otp.entity'
import { RefreshToken } from '../../src/domain/entities/refresh-token.entity'

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'test@example.com',
    emailVerifiedAt: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeOTPCode(overrides: Partial<OTPCode> = {}): OTPCode {
  return {
    id: 'otp-1',
    email: 'test@example.com',
    otpHash: '$2b$10$hashedvalue',
    expiresAt: new Date(Date.now() + 600_000),
    usedAt: null,
    failedAttempts: 0,
    ipAddress: null,
    createdAt: new Date(),
    ...overrides,
  }
}

function makeRefreshToken(overrides: Partial<RefreshToken> = {}): RefreshToken {
  return {
    id: 'rt-1',
    userId: 'user-1',
    tokenHash: 'hashed-token',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revokedAt: null,
    createdAt: new Date(),
    ...overrides,
  }
}

describe('AuthService', () => {
  let userRepo: jest.Mocked<IUserRepository>
  let otpRepo: jest.Mocked<IOTPRepository>
  let refreshTokenRepo: jest.Mocked<IRefreshTokenRepository>
  let jwtAdapter: jest.Mocked<IJWTAdapter>
  let emailProvider: jest.Mocked<IEmailProvider>
  let authService: AuthService

  beforeEach(() => {
    userRepo = {
      findByEmail: jest.fn(),
      upsertByEmail: jest.fn(),
      findById: jest.fn(),
    }

    otpRepo = {
      create: jest.fn(),
      findActive: jest.fn(),
      markUsed: jest.fn(),
      incrementAttempts: jest.fn(),
      countRecentByEmail: jest.fn(),
    }

    refreshTokenRepo = {
      create: jest.fn(),
      findByHash: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
    }

    jwtAdapter = {
      sign: jest.fn().mockReturnValue('access-token'),
      verify: jest.fn(),
      generateRefreshToken: jest.fn().mockReturnValue('raw-refresh-token'),
      hashToken: jest.fn().mockReturnValue('hashed-token'),
    }

    emailProvider = {
      sendOTP: jest.fn().mockResolvedValue(undefined),
    }

    authService = new AuthService(
      userRepo,
      otpRepo,
      refreshTokenRepo,
      jwtAdapter,
      emailProvider
    )
  })

  describe('requestOTP()', () => {
    it('creates an OTP and sends an email', async () => {
      otpRepo.countRecentByEmail.mockResolvedValue(0)
      otpRepo.create.mockResolvedValue(makeOTPCode())

      await authService.requestOTP('test@example.com', '127.0.0.1')

      expect(otpRepo.create).toHaveBeenCalledTimes(1)
      expect(emailProvider.sendOTP).toHaveBeenCalledTimes(1)
    })

    it('throws RateLimitError when too many OTPs requested', async () => {
      otpRepo.countRecentByEmail.mockResolvedValue(5)

      await expect(
        authService.requestOTP('test@example.com')
      ).rejects.toMatchObject({ code: 'RATE_LIMIT_EXCEEDED' })
    })
  })

  describe('verifyOTP()', () => {
    it('returns token pair on successful verification', async () => {
      const otp = makeOTPCode()
      otpRepo.findActive.mockResolvedValue(otp)
      otpRepo.markUsed.mockResolvedValue(undefined)
      userRepo.upsertByEmail.mockResolvedValue({ user: makeUser(), isNew: false })
      refreshTokenRepo.create.mockResolvedValue(makeRefreshToken())

      // We need to mock OTPService.verify — use bcrypt real comparison won't work easily here.
      // Instead, mock at the service boundary by patching bcrypt via jest mock.
      jest.doMock('bcrypt', () => ({
        compare: jest.fn().mockResolvedValue(true),
        hash: jest.fn().mockResolvedValue('hashed'),
      }))

      // Simpler: patch the OTPCode hash to match a known value
      // We test with a real bcrypt hash to make this an honest integration of the domain
      const { OTPService } = await import('../../src/domain/services/otp.service')
      const rawOtp = '123456'
      const hash = await OTPService.hash(rawOtp)
      otp.otpHash = hash

      const tokens = await authService.verifyOTP('test@example.com', rawOtp)

      expect(tokens).toEqual({
        accessToken: 'access-token',
        refreshToken: 'raw-refresh-token',
      })
      expect(otpRepo.markUsed).toHaveBeenCalledWith('otp-1')
    })

    it('throws UnauthorizedError when no active OTP found', async () => {
      otpRepo.findActive.mockResolvedValue(null)

      await expect(
        authService.verifyOTP('test@example.com', '123456')
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('throws UnauthorizedError when OTP is expired', async () => {
      const otp = makeOTPCode({ expiresAt: new Date(Date.now() - 1000) })
      otpRepo.findActive.mockResolvedValue(otp)

      await expect(
        authService.verifyOTP('test@example.com', '123456')
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('throws UnauthorizedError when OTP is locked', async () => {
      const otp = makeOTPCode({ failedAttempts: 5 })
      otpRepo.findActive.mockResolvedValue(otp)

      await expect(
        authService.verifyOTP('test@example.com', '123456')
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('increments attempts and throws on invalid OTP', async () => {
      const { OTPService } = await import('../../src/domain/services/otp.service')
      const hash = await OTPService.hash('999999')
      const otp = makeOTPCode({ otpHash: hash })
      otpRepo.findActive.mockResolvedValue(otp)
      otpRepo.incrementAttempts.mockResolvedValue(1)

      await expect(
        authService.verifyOTP('test@example.com', '123456')
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })

      expect(otpRepo.incrementAttempts).toHaveBeenCalledWith('otp-1')
    })
  })

  describe('refreshTokens()', () => {
    it('rotates tokens successfully', async () => {
      const stored = makeRefreshToken()
      refreshTokenRepo.findByHash.mockResolvedValue(stored)
      refreshTokenRepo.revoke.mockResolvedValue(undefined)
      userRepo.findById.mockResolvedValue(makeUser())
      refreshTokenRepo.create.mockResolvedValue(makeRefreshToken())

      const tokens = await authService.refreshTokens('raw-refresh-token')

      expect(tokens.accessToken).toBe('access-token')
      expect(refreshTokenRepo.revoke).toHaveBeenCalledWith('rt-1')
    })

    it('throws UnauthorizedError for revoked token', async () => {
      refreshTokenRepo.findByHash.mockResolvedValue(
        makeRefreshToken({ revokedAt: new Date() })
      )

      await expect(
        authService.refreshTokens('raw-refresh-token')
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('throws UnauthorizedError when token not found', async () => {
      refreshTokenRepo.findByHash.mockResolvedValue(null)

      await expect(
        authService.refreshTokens('raw-refresh-token')
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })
  })

  describe('logout()', () => {
    it('revokes the refresh token', async () => {
      refreshTokenRepo.findByHash.mockResolvedValue(makeRefreshToken())
      refreshTokenRepo.revoke.mockResolvedValue(undefined)

      await authService.logout('raw-refresh-token')

      expect(refreshTokenRepo.revoke).toHaveBeenCalledWith('rt-1')
    })

    it('does nothing when token not found', async () => {
      refreshTokenRepo.findByHash.mockResolvedValue(null)

      await expect(authService.logout('raw-refresh-token')).resolves.not.toThrow()
      expect(refreshTokenRepo.revoke).not.toHaveBeenCalled()
    })
  })
})

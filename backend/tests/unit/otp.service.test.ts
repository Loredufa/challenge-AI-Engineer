import { OTPService } from '../../src/domain/services/otp.service'

describe('OTPService', () => {
  describe('generate()', () => {
    it('returns a 6-digit numeric string', () => {
      const otp = OTPService.generate()
      expect(otp).toMatch(/^\d{6}$/)
    })

    it('returns values in range [100000, 999999]', () => {
      for (let i = 0; i < 20; i++) {
        const value = parseInt(OTPService.generate(), 10)
        expect(value).toBeGreaterThanOrEqual(100000)
        expect(value).toBeLessThanOrEqual(999999)
      }
    })
  })

  describe('hash() and verify()', () => {
    it('round-trips correctly', async () => {
      const otp = '123456'
      const hash = await OTPService.hash(otp)
      const result = await OTPService.verify(otp, hash)
      expect(result).toBe(true)
    })

    it('returns false for wrong OTP', async () => {
      const hash = await OTPService.hash('123456')
      const result = await OTPService.verify('654321', hash)
      expect(result).toBe(false)
    })
  })

  describe('isExpired()', () => {
    it('returns true when date is in the past', () => {
      const past = new Date(Date.now() - 1000)
      expect(OTPService.isExpired(past)).toBe(true)
    })

    it('returns false when date is in the future', () => {
      const future = new Date(Date.now() + 60_000)
      expect(OTPService.isExpired(future)).toBe(false)
    })
  })

  describe('isLocked()', () => {
    it('returns true when attempts >= maxAttempts', () => {
      expect(OTPService.isLocked(5, 5)).toBe(true)
      expect(OTPService.isLocked(6, 5)).toBe(true)
    })

    it('returns false when attempts < maxAttempts', () => {
      expect(OTPService.isLocked(4, 5)).toBe(false)
      expect(OTPService.isLocked(0, 5)).toBe(false)
    })
  })
})

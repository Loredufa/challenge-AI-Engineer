import crypto from 'crypto'
import bcrypt from 'bcrypt'

export class OTPService {
  static generate(): string {
    return crypto.randomInt(100000, 1000000).toString()
  }

  static async hash(otp: string): Promise<string> {
    return bcrypt.hash(otp, 10)
  }

  static async verify(otp: string, hash: string): Promise<boolean> {
    return bcrypt.compare(otp, hash)
  }

  static isExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt
  }

  static isLocked(failedAttempts: number, maxAttempts: number): boolean {
    return failedAttempts >= maxAttempts
  }
}

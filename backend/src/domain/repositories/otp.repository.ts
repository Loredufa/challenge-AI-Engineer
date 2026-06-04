import { OTPCode } from '@domain/entities/otp.entity'

export interface IOTPRepository {
  create(data: {
    email: string
    otpHash: string
    expiresAt: Date
    ipAddress?: string
  }): Promise<OTPCode>
  findActive(email: string): Promise<OTPCode | null>
  markUsed(id: string): Promise<void>
  incrementAttempts(id: string): Promise<number>
  countRecentByEmail(email: string, windowMs: number): Promise<number>
}

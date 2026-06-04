export interface OTPCode {
  id: string
  email: string
  otpHash: string
  expiresAt: Date
  usedAt: Date | null
  failedAttempts: number
  ipAddress: string | null
  createdAt: Date
}

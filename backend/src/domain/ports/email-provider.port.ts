export interface IEmailProvider {
  sendOTP(email: string, otp: string): Promise<void>
}

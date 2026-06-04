import { Resend } from 'resend'
import { IEmailProvider } from '@domain/ports/email-provider.port'
import logger from '@shared/logger'

export class ResendEmailAdapter implements IEmailProvider {
  private readonly client: Resend
  private readonly fromAddress: string

  constructor(apiKey: string, fromAddress: string) {
    this.client = new Resend(apiKey)
    this.fromAddress = fromAddress
  }

  async sendOTP(email: string, otp: string): Promise<void> {
    await this.client.emails.send({
      from: this.fromAddress,
      to: email,
      subject: 'Your DocuMind login code',
      text: `Your one-time login code is: ${otp}\n\nThis code expires in 10 minutes.`,
    })
  }
}

export class ConsoleEmailAdapter implements IEmailProvider {
  async sendOTP(email: string, otp: string): Promise<void> {
    logger.info('OTP email (console)', { email, otp })
  }
}

export class SESEmailAdapter implements IEmailProvider {
  private readonly fromAddress: string

  constructor(fromAddress: string) {
    this.fromAddress = fromAddress
  }

  async sendOTP(email: string, otp: string): Promise<void> {
    // Lazy import to avoid loading AWS SDK in tests / dev where not needed
    const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses')
    const client = new SESClient({ region: process.env.AWS_REGION ?? 'us-east-1' })

    await client.send(
      new SendEmailCommand({
        Source: this.fromAddress,
        Destination: { ToAddresses: [email] },
        Message: {
          Subject: { Data: 'Your DocuMind login code' },
          Body: {
            Text: {
              Data: `Your one-time login code is: ${otp}\n\nThis code expires in 10 minutes.`,
            },
          },
        },
      })
    )
  }
}

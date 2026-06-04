import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { Readable } from 'stream'

const LOCAL_BASE = path.join(os.tmpdir(), 's3-local')

function isLocalMode(): boolean {
  return !process.env.AWS_ACCESS_KEY_ID
}

export class S3Adapter {
  private client: S3Client
  private bucket: string
  private local: boolean

  constructor(region: string, bucket: string) {
    this.bucket = bucket
    this.local = isLocalMode()
    this.client = new S3Client({ region })
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    if (this.local) {
      const filePath = path.join(LOCAL_BASE, key)
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, body)
      return key
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    )
    return key
  }

  async getPresignedUrl(key: string, expiresIn = 900): Promise<string> {
    if (this.local) {
      return `file://${path.join(LOCAL_BASE, key)}`
    }

    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key })
    return getSignedUrl(this.client, command, { expiresIn })
  }

  async delete(key: string): Promise<void> {
    if (this.local) {
      const filePath = path.join(LOCAL_BASE, key)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      return
    }
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }

  async getBuffer(key: string): Promise<Buffer> {
    if (this.local) {
      const filePath = path.join(LOCAL_BASE, key)
      return fs.readFileSync(filePath)
    }

    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key })
    )

    if (!response.Body) {
      throw new Error(`No body returned for key: ${key}`)
    }

    const stream = response.Body as Readable
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }
}

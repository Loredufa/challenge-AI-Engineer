import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('8080').transform(Number),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string(),
  LLM_PROVIDER: z.enum(['openai', 'openai-compatible', 'anthropic', 'mock']).default('mock'),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  LLM_BASE_URL: z.string().url().optional(),
  JWT_PRIVATE_KEY: z.string().transform(s => s.replace(/\\n/g, '\n')),
  JWT_PUBLIC_KEY: z.string().transform(s => s.replace(/\\n/g, '\n')),
  OPENAI_API_KEY: z.string().default('mock'),
  S3_BUCKET: z.string().default('documind-local'),
  EMAIL_PROVIDER: z.enum(['ses', 'resend', 'console']).default('console'),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().default('onboarding@resend.dev'),
  AWS_REGION: z.string().default('us-east-1'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX: z.string().default('100').transform(Number),
})

export const env = envSchema.parse(process.env)
export type Env = z.infer<typeof envSchema>

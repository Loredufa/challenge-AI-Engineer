/**
 * Sets minimum required env vars for unit tests that import from @shared/env.
 * Must be required BEFORE any module that transitively imports env.ts.
 *
 * The JWT adapter test manages its own keys; this provides safe defaults for
 * everything else so Zod's schema.parse(process.env) doesn't throw.
 */

import crypto from 'crypto'

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgres://dev:dev@localhost:5432/documind_test'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.JWT_PRIVATE_KEY = privateKey
process.env.JWT_PUBLIC_KEY = publicKey
process.env.LLM_PROVIDER = 'mock'
process.env.EMAIL_PROVIDER = 'console'

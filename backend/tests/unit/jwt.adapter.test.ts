/**
 * Test-env.ts (setupFiles) already sets JWT_PRIVATE_KEY / JWT_PUBLIC_KEY to a generated
 * RSA keypair before any module is loaded, so env.ts parses correctly.
 * We re-read those same keys here for our assertions.
 */
import { JWTAdapter } from '../../src/infrastructure/adapters/jwt.adapter'

describe('JWTAdapter', () => {
  let adapter: JWTAdapter

  beforeEach(() => {
    adapter = new JWTAdapter()
  })

  describe('sign() and verify()', () => {
    it('signs and verifies a token successfully', () => {
      const payload = { sub: 'user-123', email: 'test@example.com' }
      const token = adapter.sign(payload, '1h')
      const decoded = adapter.verify(token)

      expect(decoded.sub).toBe('user-123')
      expect(decoded.email).toBe('test@example.com')
      expect(decoded.jti).toBeDefined()
    })

    it('throws for an expired token', async () => {
      const payload = { sub: 'user-123', email: 'test@example.com' }
      const token = adapter.sign(payload, '1ms')

      await new Promise((r) => setTimeout(r, 10))

      expect(() => adapter.verify(token)).toThrow()
    })

    it('throws for a malformed token', () => {
      expect(() => adapter.verify('not.a.valid.token')).toThrow()
    })
  })

  describe('generateRefreshToken()', () => {
    it('generates a 64-char hex string', () => {
      const token = adapter.generateRefreshToken()
      expect(token).toHaveLength(64)
      expect(token).toMatch(/^[0-9a-f]+$/)
    })

    it('generates unique tokens each call', () => {
      const t1 = adapter.generateRefreshToken()
      const t2 = adapter.generateRefreshToken()
      expect(t1).not.toBe(t2)
    })
  })

  describe('hashToken()', () => {
    it('produces a deterministic SHA-256 hex hash', () => {
      const token = 'test-token'
      const h1 = adapter.hashToken(token)
      const h2 = adapter.hashToken(token)
      expect(h1).toBe(h2)
      expect(h1).toHaveLength(64)
    })
  })
})

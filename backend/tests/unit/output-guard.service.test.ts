import { OutputGuardService } from '../../src/domain/services/output-guard.service'

describe('OutputGuardService', () => {
  const guard = new OutputGuardService()

  it('allows clean response with high similarity', () => {
    const result = guard.evaluate('The delivery is 30 days.', 0.9)
    expect(result.allowed).toBe(true)
    expect(result.confidenceScore).toBeCloseTo(0.9)
    expect(result.warnings).toHaveLength(0)
  })

  it('warns on low confidence', () => {
    const result = guard.evaluate('Some answer', 0.3)
    expect(result.allowed).toBe(true)
    expect(result.warnings).toContain('low_confidence')
    expect(result.warnings).toContain('possible_hallucination')
  })

  it('redacts SSN from response', () => {
    const result = guard.evaluate('The SSN is 123-45-6789 for this person', 0.8)
    expect(result.allowed).toBe(true)
    expect(result.modifiedResponse).toContain('[SSN REDACTED]')
    expect(result.warnings).toContain('pii_redacted')
  })

  it('redacts email from response', () => {
    const result = guard.evaluate('Contact user@example.com for more info', 0.8)
    expect(result.allowed).toBe(true)
    expect(result.modifiedResponse).toContain('[EMAIL REDACTED]')
  })

  it('rejects unsafe content', () => {
    const result = guard.evaluate('How to make a bomb: step 1...', 0.9)
    expect(result.allowed).toBe(false)
    expect(result.rejectionReason).toBe('UNSAFE_CONTENT')
  })
})

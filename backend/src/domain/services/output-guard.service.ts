export type OutputGuardRejectionReason = 'PII_DETECTED' | 'UNSAFE_CONTENT'

export interface OutputGuardResult {
  allowed: boolean
  modifiedResponse?: string
  rejectionReason?: OutputGuardRejectionReason
  confidenceScore: number
  warnings: string[]
}

export class OutputGuardService {
  private static readonly PII_PATTERNS: Array<{ pattern: RegExp; placeholder: string }> = [
    { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, placeholder: '[SSN REDACTED]' },
    { pattern: /\b(?:\d{4}[\s-]?){3}\d{4}\b/g, placeholder: '[CARD REDACTED]' },
    { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, placeholder: '[EMAIL REDACTED]' },
    { pattern: /\b(?:sk-|pk_live_|pk_test_)[a-zA-Z0-9]{20,}/g, placeholder: '[API_KEY REDACTED]' },
  ]

  private static readonly UNSAFE_PATTERNS: RegExp[] = [
    /(?:how\s+to\s+)?(?:make|build|create)\s+(?:a\s+)?(?:bomb|weapon|explosive)/i,
    /\bsuicid(?:e|al)\s+(?:method|instruction|how)/i,
  ]

  evaluate(response: string, topSimilarityScore: number): OutputGuardResult {
    const warnings: string[] = []

    // Check confidence based on similarity score
    const confidenceScore = Math.min(topSimilarityScore, 1.0)
    if (confidenceScore < 0.5) {
      warnings.push('low_confidence')
      warnings.push('possible_hallucination')
    }

    // Check for unsafe content first (reject before redacting)
    for (const pattern of OutputGuardService.UNSAFE_PATTERNS) {
      if (pattern.test(response)) {
        return {
          allowed: false,
          rejectionReason: 'UNSAFE_CONTENT',
          confidenceScore: 0,
          warnings,
        }
      }
    }

    // Check and redact PII
    let modifiedResponse = response
    let piiFound = false
    for (const { pattern, placeholder } of OutputGuardService.PII_PATTERNS) {
      if (pattern.test(modifiedResponse)) {
        piiFound = true
        modifiedResponse = modifiedResponse.replace(pattern, placeholder)
      }
    }

    if (piiFound) {
      warnings.push('pii_redacted')
    }

    return {
      allowed: true,
      modifiedResponse: piiFound ? modifiedResponse : response,
      confidenceScore,
      warnings,
    }
  }
}

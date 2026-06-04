export class DocumentSanitizerService {
  private static readonly INJECTION_PATTERNS = [
    /ignore\s+(?:all\s+)?previous\s+instructions?/i,
    /forget\s+(?:all\s+)?(?:your\s+)?instructions?/i,
    /system\s*:/i,
    /\[INST\]/i,
    /##\s*override/i,
    /you\s+are\s+now/i,
    /new\s+instructions?:/i,
  ]

  sanitize(text: string): { safe: boolean; reason?: string } {
    for (const pattern of DocumentSanitizerService.INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        return { safe: false, reason: `Detected potential prompt injection: ${pattern.source}` }
      }
    }
    return { safe: true }
  }
}

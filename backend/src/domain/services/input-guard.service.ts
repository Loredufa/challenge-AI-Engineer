export type InputGuardRejectionReason =
  | 'PROMPT_INJECTION'
  | 'JAILBREAK'
  | 'PROMPT_EXTRACTION'
  | 'INSTRUCTION_OVERRIDE'
  | 'PII_DETECTED'
  | 'MALICIOUS_PAYLOAD'

export interface InputGuardResult {
  allowed: boolean
  rejectionReason?: InputGuardRejectionReason
  sanitizedInput?: string
  flaggedPatterns: string[]
  evaluationMs: number
}

export class InputGuardService {
  private static readonly RULES: Array<{
    name: InputGuardRejectionReason
    patterns: RegExp[]
  }> = [
    {
      name: 'PROMPT_INJECTION',
      patterns: [
        // English
        /ignore\s+(?:all\s+)?previous\s+instructions?/i,
        /forget\s+(?:all\s+)?(?:your\s+)?instructions?/i,
        /\bsystem\s*:/i,
        /\[INST\]/i,
        /##\s*override/i,
        /disregard\s+(?:all\s+)?(?:previous\s+)?instructions?/i,
        // Spanish
        /ignora\s+(?:todas?\s+)?(?:las\s+)?instrucciones?\s+anteriores?/i,
        /olvida\s+(?:todas?\s+)?(?:tus\s+)?instrucciones?/i,
        /descarta\s+(?:todas?\s+)?(?:las\s+)?instrucciones?\s+anteriores?/i,
      ],
    },
    {
      name: 'JAILBREAK',
      patterns: [
        // English
        /\bDAN\b/,
        /developer\s+mode/i,
        /without\s+restrictions/i,
        /pretend\s+(?:you\s+)?(?:are|you're)\s+(?!human)/i,
        /act\s+as\s+(?:if\s+you\s+(?:are|were)\s+)?(?:an?\s+)?(?:AI\s+)?(?:without|with\s+no)/i,
        /jailbreak/i,
        // Spanish
        /sin\s+restricciones/i,
        /modo\s+desarrollador/i,
        /act[úu]a\s+(?:como\s+)?(?:si\s+(?:fueras?|eres)\s+)?(?:una?\s+)?(?:IA\s+)?(?:sin|con\s+ninguna)/i,
        /finge\s+(?:que\s+)?(?:eres|ser)\s+(?!humano)/i,
      ],
    },
    {
      name: 'PROMPT_EXTRACTION',
      patterns: [
        // English
        /(?:show|reveal|repeat|print|display)\s+(?:me\s+)?(?:your\s+)?(?:system\s+)?(?:prompt|instructions?)/i,
        /what\s+(?:are\s+)?your\s+instructions?/i,
        /what\s+(?:is\s+)?your\s+(?:system\s+)?prompt/i,
        // Spanish
        /(?:mu[eé]stra(?:me)?|revela|repite|dime)\s+(?:tu[s]?\s+)?(?:instrucciones?|prompt|sistema)/i,
        /cu[aá]les?\s+son\s+tus\s+instrucciones?/i,
        /qu[eé]\s+(?:tienes?\s+)?(?:prohibido|permitido|instrucciones?)/i,
        /cu[aá]l\s+es\s+tu\s+(?:prompt|instrucción|sistema)/i,
        /lista(?:me)?\s+(?:lo\s+que\s+(?:tienes?\s+)?(?:prohibido|permitido))/i,
      ],
    },
    {
      name: 'INSTRUCTION_OVERRIDE',
      patterns: [
        // English
        /from\s+now\s+on\s+(?:you\s+are|act)/i,
        /your\s+new\s+instructions?\s+(?:are|:)/i,
        /(?:new|updated)\s+(?:system\s+)?prompt:/i,
        /override\s+(?:your\s+)?(?:previous\s+)?instructions?/i,
        // Spanish
        /(?:a\s+partir\s+de\s+ahora|desde\s+ahora)\s+(?:eres?|act[úu]a)/i,
        /tus\s+nuevas?\s+instrucciones?\s+(?:son|:)/i,
        /nuevo\s+(?:prompt|sistema|instrucción)\s*:/i,
        /sobreescrib[ei]\s+(?:tus\s+)?(?:instrucciones?|configuración)/i,
      ],
    },
    {
      name: 'PII_DETECTED',
      patterns: [
        /\b\d{3}-\d{2}-\d{4}\b/, // SSN
        /\b(?:\d{4}[\s-]?){3}\d{4}\b/, // Credit card
        /\b(password|passwd|secret|api_key|apikey)\s*[:=]\s*\S+/i, // Credentials
        /\b(?:sk-|pk_live_|pk_test_)[a-zA-Z0-9]{20,}/, // API keys
      ],
    },
  ]

  evaluate(input: string): InputGuardResult {
    const start = Date.now()

    for (const rule of InputGuardService.RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(input)) {
          return {
            allowed: false,
            rejectionReason: rule.name,
            flaggedPatterns: [pattern.source],
            evaluationMs: Date.now() - start,
          }
        }
      }
    }

    return {
      allowed: true,
      flaggedPatterns: [],
      evaluationMs: Date.now() - start,
    }
  }
}

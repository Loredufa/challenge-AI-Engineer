export interface Chunk {
  content: string
  chunkIndex: number
  pageNumber?: number
  tokenCount: number
}

function countTokens(text: string): number {
  // Approximation: 1 token ≈ 4 characters (tiktoken cl100k_base convention)
  // Using approximation for broad compatibility across environments
  return Math.ceil(text.length / 4)
}

export class ChunkerService {
  private readonly chunkSize: number
  private readonly chunkOverlap: number
  private readonly separators: string[]

  constructor(chunkSize = 512, chunkOverlap = 50) {
    this.chunkSize = chunkSize
    this.chunkOverlap = chunkOverlap
    this.separators = ['\n\n', '\n', '. ', ' ']
  }

  chunk(text: string, pageNumber?: number): Chunk[] {
    const rawChunks = this._splitRecursive(text, this.separators)
    const result: Chunk[] = []

    for (let i = 0; i < rawChunks.length; i++) {
      const content = rawChunks[i].trim()
      if (content.length === 0) continue
      result.push({
        content,
        chunkIndex: result.length,
        pageNumber,
        tokenCount: countTokens(content),
      })
    }

    return result
  }

  private _splitRecursive(text: string, separators: string[]): string[] {
    const tokenCount = countTokens(text)
    if (tokenCount <= this.chunkSize) {
      return [text]
    }

    // Try each separator in order until we can split
    for (const sep of separators) {
      const parts = text.split(sep)
      if (parts.length <= 1) continue

      // Merge parts back into chunks that respect chunkSize
      const chunks: string[] = []
      let current = ''

      for (const part of parts) {
        const candidate = current.length > 0 ? current + sep + part : part
        if (countTokens(candidate) <= this.chunkSize) {
          current = candidate
        } else {
          if (current.length > 0) {
            chunks.push(current)
            // Add overlap: take the tail of the last chunk
            const overlapText = this._getOverlap(current)
            current = overlapText.length > 0 ? overlapText + sep + part : part
          } else {
            // Part itself exceeds chunkSize — recurse with next separator
            const remaining = separators.slice(separators.indexOf(sep) + 1)
            if (remaining.length > 0) {
              chunks.push(...this._splitRecursive(part, remaining))
            } else {
              // Hard split by approximate token boundary (char count)
              chunks.push(...this._hardSplit(part))
            }
            current = ''
          }
        }
      }
      if (current.trim().length > 0) {
        chunks.push(current)
      }

      return chunks
    }

    // No separator worked — hard split
    return this._hardSplit(text)
  }

  private _getOverlap(text: string): string {
    const targetChars = this.chunkOverlap * 4
    if (text.length <= targetChars) return text
    return text.slice(text.length - targetChars)
  }

  private _hardSplit(text: string): string[] {
    const maxChars = this.chunkSize * 4
    const overlapChars = this.chunkOverlap * 4
    const chunks: string[] = []
    let start = 0

    while (start < text.length) {
      const end = Math.min(start + maxChars, text.length)
      chunks.push(text.slice(start, end))
      start = end - overlapChars
      if (start >= text.length) break
    }

    return chunks
  }
}

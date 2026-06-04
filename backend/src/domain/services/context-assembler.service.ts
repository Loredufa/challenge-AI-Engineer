import { SimilarChunk } from '@domain/repositories/embedding.repository'

export interface AssembledContext {
  contextText: string
  sources: Array<{
    documentId: string
    documentName: string
    chunkId: string
    pageNumber: number | null
    excerpt: string
    similarityScore: number
  }>
  tokenCount: number
}

export class ContextAssemblerService {
  private readonly maxContextTokens: number

  constructor(maxContextTokens = 2000) {
    this.maxContextTokens = maxContextTokens
  }

  assemble(chunks: SimilarChunk[]): AssembledContext {
    // Sort by page number for narrative coherence, then by similarity for tie-breaking
    const sorted = [...chunks].sort((a, b) => {
      const pageA = a.chunk.pageNumber ?? Infinity
      const pageB = b.chunk.pageNumber ?? Infinity
      if (pageA !== pageB) return pageA - pageB
      return b.similarity - a.similarity
    })

    // Deduplicate chunks by content
    const seen = new Set<string>()
    const deduplicated = sorted.filter((sc) => {
      if (seen.has(sc.chunk.content)) return false
      seen.add(sc.chunk.content)
      return true
    })

    const contextParts: string[] = []
    const sources: AssembledContext['sources'] = []
    let tokenCount = 0

    for (const sc of deduplicated) {
      const pageLabel = sc.chunk.pageNumber != null ? `Page: ${sc.chunk.pageNumber}` : 'Page: N/A'
      const header = `[Document: ${sc.documentName} | ${pageLabel}]`
      const block = `<context>\n${header}\n${sc.chunk.content}\n</context>`

      // Approximate token count: chars / 4
      const blockTokens = Math.ceil(block.length / 4)
      if (tokenCount + blockTokens > this.maxContextTokens) break

      contextParts.push(block)
      tokenCount += blockTokens

      sources.push({
        documentId: sc.chunk.documentId,
        documentName: sc.documentName,
        chunkId: sc.chunk.id,
        pageNumber: sc.chunk.pageNumber,
        excerpt: sc.chunk.content.substring(0, 200),
        similarityScore: sc.similarity,
      })
    }

    return {
      contextText: contextParts.join('\n\n'),
      sources,
      tokenCount,
    }
  }
}

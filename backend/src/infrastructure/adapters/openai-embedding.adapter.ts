import OpenAI from 'openai'
import { IEmbeddingProvider } from '@domain/ports/embedding-provider.port'

const BATCH_SIZE = 20
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class OpenAIEmbeddingAdapter implements IEmbeddingProvider {
  private client: OpenAI
  private model = 'text-embedding-3-small'
  private dimensions = 1536

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
    })
    return response.data[0].embedding
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = []

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE)
      let lastError: Error | undefined

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const response = await this.client.embeddings.create({
            model: this.model,
            input: batch,
          })
          // Sort by index to preserve original order
          const sorted = response.data
            .slice()
            .sort((a, b) => a.index - b.index)
          results.push(...sorted.map((d) => d.embedding))
          lastError = undefined
          break
        } catch (err: unknown) {
          lastError = err instanceof Error ? err : new Error(String(err))
          const isRateLimit =
            err instanceof OpenAI.APIError && err.status === 429
          if (isRateLimit && attempt < MAX_RETRIES - 1) {
            await sleep(RETRY_DELAY_MS * Math.pow(2, attempt))
          } else {
            break
          }
        }
      }

      if (lastError) throw lastError
    }

    return results
  }

  getModelName(): string {
    return this.model
  }

  getDimensions(): number {
    return this.dimensions
  }
}

import { IEmbeddingProvider } from '@domain/ports/embedding-provider.port'

// Deterministic hash-based embeddings: similar texts produce similar vectors.
// Uses a simple word-frequency approach: each word hashes to a bucket position,
// then the vector is L2-normalized. Same input → same output every time.
export class MockEmbeddingAdapter implements IEmbeddingProvider {
  private readonly DIMS = 1536

  async embed(text: string): Promise<number[]> {
    const vec = new Array<number>(this.DIMS).fill(0)
    const words = text.toLowerCase().split(/\W+/).filter(Boolean)
    for (const word of words) {
      const bucket = this.hash(word) % this.DIMS
      vec[bucket] += 1
    }
    return this.normalize(vec)
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embed(t)))
  }

  getModelName(): string { return 'mock' }
  getDimensions(): number { return this.DIMS }

  private hash(s: string): number {
    let h = 5381
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) + h) ^ s.charCodeAt(i)
      h = h >>> 0
    }
    return h
  }

  private normalize(vec: number[]): number[] {
    const mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0))
    return mag === 0 ? vec : vec.map(v => v / mag)
  }
}

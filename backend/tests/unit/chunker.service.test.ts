import { ChunkerService } from '../../src/domain/services/chunker.service'

describe('ChunkerService', () => {
  let chunker: ChunkerService

  beforeEach(() => {
    chunker = new ChunkerService(512, 50)
  })

  describe('chunk() - basic behavior', () => {
    it('returns a single chunk for short text (< 512 tokens)', () => {
      const text = 'This is a short document. It has only a few sentences.'
      const chunks = chunker.chunk(text)
      expect(chunks.length).toBe(1)
      expect(chunks[0].content).toBe(text)
      expect(chunks[0].chunkIndex).toBe(0)
    })

    it('returns at least one chunk for non-empty text', () => {
      const text = 'Hello world.'
      const chunks = chunker.chunk(text)
      expect(chunks.length).toBeGreaterThanOrEqual(1)
    })

    it('returns empty array for empty string', () => {
      const chunks = chunker.chunk('')
      expect(chunks.length).toBe(0)
    })

    it('assigns sequential chunk indexes starting at 0', () => {
      // ~512 tokens = ~2048 chars; create text long enough for multiple chunks
      const paragraph = 'This is a test sentence with meaningful content. '.repeat(50)
      const text = (paragraph + '\n\n').repeat(10)
      const chunks = chunker.chunk(text)
      expect(chunks.length).toBeGreaterThan(1)
      chunks.forEach((chunk, i) => {
        expect(chunk.chunkIndex).toBe(i)
      })
    })

    it('includes tokenCount for each chunk', () => {
      const text = 'Some text here.'
      const chunks = chunker.chunk(text)
      expect(chunks[0].tokenCount).toBeGreaterThan(0)
    })
  })

  describe('chunk() - long text', () => {
    it('splits long text into multiple chunks', () => {
      // 512 tokens * 4 chars = ~2048 chars per chunk; create ~6000 chars
      const longText = 'word '.repeat(1500) // ~1500 words, way more than 512 tokens
      const chunks = chunker.chunk(longText)
      expect(chunks.length).toBeGreaterThan(1)
    })

    it('each chunk content is non-empty', () => {
      const longText = 'sentence number here. '.repeat(300)
      const chunks = chunker.chunk(longText)
      for (const chunk of chunks) {
        expect(chunk.content.trim().length).toBeGreaterThan(0)
      }
    })

    it('all chunks together cover the original text content', () => {
      const sentences = Array.from({ length: 200 }, (_, i) => `Sentence ${i} has content.`)
      const text = sentences.join('\n\n')
      const chunks = chunker.chunk(text)
      const combined = chunks.map((c) => c.content).join(' ')
      // Every sentence should appear somewhere in the chunks
      for (const sentence of sentences) {
        expect(combined).toContain(sentence)
      }
    })
  })

  describe('chunk() - page number', () => {
    it('assigns pageNumber when provided', () => {
      const text = 'Short page text.'
      const chunks = chunker.chunk(text, 3)
      expect(chunks[0].pageNumber).toBe(3)
    })

    it('pageNumber is undefined when not provided', () => {
      const text = 'Short page text.'
      const chunks = chunker.chunk(text)
      expect(chunks[0].pageNumber).toBeUndefined()
    })
  })

  describe('chunk() - custom sizes', () => {
    it('respects custom chunkSize', () => {
      const smallChunker = new ChunkerService(50, 5) // 50 tokens = ~200 chars
      const text = 'word '.repeat(200)
      const chunks = smallChunker.chunk(text)
      expect(chunks.length).toBeGreaterThan(1)
      for (const chunk of chunks) {
        // Each chunk should be at most ~50 tokens (approx)
        expect(chunk.tokenCount).toBeLessThanOrEqual(55) // small buffer for overlap
      }
    })
  })
})

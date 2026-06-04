import pdfParse from 'pdf-parse'
import { fixEncoding } from '@shared/encoding'

interface PDFTextItem {
  str: string
}

interface PDFTextContent {
  items: PDFTextItem[]
}

interface PDFPageData {
  getTextContent(): Promise<PDFTextContent>
}

export interface ParsedDocument {
  text: string
  pageTexts: Array<{ page: number; text: string }>
  totalPages: number
  totalCharacters: number
}

export class PDFParserService {
  async parse(buffer: Buffer): Promise<ParsedDocument> {
    const pageTexts: Array<{ page: number; text: string }> = []
    let pageCounter = 0

    const data = await pdfParse(buffer, {
      pagerender: (pageData: PDFPageData) => {
        return pageData.getTextContent().then((textContent: PDFTextContent) => {
          pageCounter++
          const text = fixEncoding(
            textContent.items.map((item: PDFTextItem) => item.str).join(' ')
          )
          pageTexts.push({ page: pageCounter, text })
          return text
        })
      },
    })

    return {
      text: fixEncoding(data.text),
      pageTexts,
      totalPages: data.numpages,
      totalCharacters: data.text.length,
    }
  }
}

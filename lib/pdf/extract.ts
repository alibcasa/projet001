export type ExtractedPage = { pageNumber: number; text: string }

export async function extractPdf(buffer: ArrayBuffer): Promise<{ pages: ExtractedPage[]; text: string }> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const task = pdfjs.getDocument({ data: new Uint8Array(buffer) })
  const pdf = await task.promise
  const pages: ExtractedPage[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const text = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    pages.push({ pageNumber, text })
  }

  return {
    pages,
    text: pages.map((page) => page.text).join('\n\n'),
  }
}

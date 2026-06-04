// Detects UTF-8 bytes misread as Latin-1 (e.g. "ó" → "Ã³", "ñ" → "Ã±")
function hasMojibake(text: string): boolean {
  return /[\xC2-\xDF][\x80-\xBF]/.test(text)
}

export function fixEncoding(text: string): string {
  if (!hasMojibake(text)) return text
  return Buffer.from(text, 'latin1').toString('utf8')
}

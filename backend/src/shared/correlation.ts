import { v4 as uuidv4 } from 'uuid'

export function generateCorrelationId(existing?: string): string {
  return existing ?? uuidv4()
}

export function generateRequestId(): string {
  return uuidv4()
}

import crypto from 'crypto'

export interface RSAKeyPair {
  privateKey: string
  publicKey: string
}

export function generateRSAKeyPair(): RSAKeyPair {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })
  return { privateKey, publicKey }
}

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
})

const priv = JSON.stringify(privateKey)
const pub = JSON.stringify(publicKey)

const out = `JWT_PRIVATE_KEY=${priv}\nJWT_PUBLIC_KEY=${pub}\n`
fs.writeFileSync(path.join(__dirname, 'jwt-keys.txt'), out)
console.log('Done! jwt-keys.txt created.')
console.log('First line preview:', `JWT_PRIVATE_KEY=${priv.slice(0, 40)}...`)

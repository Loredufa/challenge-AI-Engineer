import { Router } from 'express'
import multer from 'multer'
import { DocumentController } from '@application/controllers/document.controller'
import { authMiddleware } from '@application/middleware/auth.middleware'
import { JWTAdapter } from '@infrastructure/adapters/jwt.adapter'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Only PDF files are allowed'))
    }
  },
})

export function createDocumentRouter(
  documentController: DocumentController,
  jwtAdapter: JWTAdapter
): Router {
  const router = Router()
  const auth = authMiddleware(jwtAdapter)

  router.post(
    '/documents/upload',
    auth,
    upload.single('file'),
    documentController.upload
  )

  router.get('/documents', auth, documentController.list)

  router.get('/documents/:id', auth, documentController.getById)

  router.delete('/documents/:id', auth, documentController.delete)

  return router
}

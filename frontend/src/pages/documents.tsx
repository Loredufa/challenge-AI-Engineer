import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import api, { deleteDocument } from '../lib/api'
import { authStore } from '../lib/auth'
import type { Document } from '../lib/types'
import { Layout } from '../components/Layout'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorBanner } from '../components/ErrorBanner'

const POLL_INTERVAL = 3000
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const TRANSITIONAL = new Set<Document['status']>(['PENDING', 'PROCESSING'])

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function StatusBadge({ status }: { status: Document['status'] }) {
  switch (status) {
    case 'PENDING':
      return (
        <span className="badge-yellow flex items-center gap-1">
          <LoadingSpinner size="sm" />
          Pending
        </span>
      )
    case 'PROCESSING':
      return (
        <span className="badge-yellow flex items-center gap-1">
          <LoadingSpinner size="sm" />
          Processing
        </span>
      )
    case 'READY':
      return <span className="badge-green">Ready</span>
    case 'FAILED':
      return <span className="badge-red">Failed</span>
    case 'QUARANTINED':
      return <span className="badge-red">Unsafe content</span>
    default:
      return <span className="badge-yellow">{status}</span>
  }
}

export default function DocumentsPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [documents, setDocuments] = useState<Document[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [docsError, setDocsError] = useState<string | null>(null)

  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle')
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!authStore.isAuthenticated()) {
      router.replace('/login')
    }
  }, [router])

  const fetchDocuments = useCallback(async () => {
    try {
      const { data } = await api.get<{ data: Document[] }>('/documents')
      setDocuments(data.data ?? [])
      setDocsError(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load documents.'
      setDocsError(msg)
    } finally {
      setLoadingDocs(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // Poll while any doc is in transitional state
  useEffect(() => {
    const hasTransitional = documents.some((d) => TRANSITIONAL.has(d.status))
    if (hasTransitional && !pollRef.current) {
      pollRef.current = setInterval(fetchDocuments, POLL_INTERVAL)
    }
    if (!hasTransitional && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [documents, fetchDocuments])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Client-side validation
    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are accepted.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File must be 10 MB or smaller.')
      return
    }

    setUploadError(null)
    setUploadState('uploading')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const { data } = await api.post<{ documentId: string }>('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setUploadState('processing')

      const placeholder: Document = {
        id: data.documentId,
        originalName: file.name,
        filename: file.name,
        status: 'PROCESSING',
        totalPages: null,
        totalChunks: null,
        sizeBytes: file.size,
        createdAt: new Date().toISOString(),
      }
      setDocuments((prev) => [placeholder, ...prev])
      setUploadState('done')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Try again.'
      setUploadError(msg)
      setUploadState('error')
    } finally {
      // Reset file input so the same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    setConfirmDeleteId(null)
    try {
      await deleteDocument(id)
      setDocuments((prev) => prev.filter((d) => d.id !== id))
    } catch {
      setDocsError('Failed to delete document. Try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const hasReady = documents.some((d) => d.status === 'READY')

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
          <p className="text-sm text-gray-500 mt-1">
            Upload PDF files and query them with AI.
          </p>
        </div>

        {/* Upload section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Upload a PDF</h3>

          {uploadError && (
            <div className="mb-4">
              <ErrorBanner message={uploadError} onDismiss={() => setUploadError(null)} />
            </div>
          )}

          {uploadState === 'done' && (
            <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              Document uploaded. Processing in background — status will update automatically.
            </p>
          )}

          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Click to upload PDF"
          >
            {uploadState === 'uploading' ? (
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <LoadingSpinner size="md" />
                <span className="text-sm font-medium">Uploading...</span>
              </div>
            ) : uploadState === 'processing' ? (
              <div className="flex items-center justify-center gap-2 text-yellow-600">
                <LoadingSpinner size="md" />
                <span className="text-sm font-medium">Processing your document...</span>
              </div>
            ) : (
              <>
                <p className="text-gray-500 text-sm">
                  Drag & drop or click to select a PDF
                </p>
                <p className="text-xs text-gray-400 mt-1">Max 10 MB</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Document list */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Your documents</h3>
            {hasReady && (
              <Link href="/chat" className="btn-primary text-sm">
                Go to Chat
              </Link>
            )}
          </div>

          {docsError && (
            <div className="p-4">
              <ErrorBanner message={docsError} onDismiss={() => setDocsError(null)} />
            </div>
          )}

          {loadingDocs ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <LoadingSpinner size="lg" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">No documents yet. Upload your first PDF.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">Name</th>
                    <th className="px-6 py-3 text-left font-medium">Status</th>
                    <th className="px-6 py-3 text-left font-medium">Pages</th>
                    <th className="px-6 py-3 text-left font-medium">Chunks</th>
                    <th className="px-6 py-3 text-left font-medium">Size</th>
                    <th className="px-6 py-3 text-left font-medium">Uploaded</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 max-w-xs truncate">
                        {doc.originalName ?? doc.filename}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {doc.totalPages ?? '—'}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {doc.totalChunks ?? '—'}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {formatBytes(doc.sizeBytes)}
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {deletingId === doc.id ? (
                          <LoadingSpinner size="sm" />
                        ) : confirmDeleteId === doc.id ? (
                          <span className="flex items-center justify-end gap-2 text-sm">
                            <span className="text-gray-500">Delete?</span>
                            <button
                              onClick={() => handleDelete(doc.id)}
                              className="text-red-600 font-medium hover:text-red-800"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(doc.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete document"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

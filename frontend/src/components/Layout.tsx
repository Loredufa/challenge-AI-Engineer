import Link from 'next/link'
import { useRouter } from 'next/router'
import type { ReactNode } from 'react'
import api from '../lib/api'
import { authStore } from '../lib/auth'

interface Props {
  children: ReactNode
}

export function Layout({ children }: Props) {
  const router = useRouter()

  async function handleLogout() {
    try {
      await api.post('/auth/logout', { refreshToken: authStore.getRefreshToken() })
    } catch {
      // ignore server errors on logout
    } finally {
      authStore.clearTokens()
      router.push('/login')
    }
  }

  const linkClass = (href: string) =>
    `text-sm font-medium transition-colors ${
      router.pathname === href
        ? 'text-white'
        : 'text-slate-400 hover:text-slate-100'
    }`

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/logo.png" alt="DocuMind AI" className="h-20 w-auto" />
          </div>
          <div className="flex items-center gap-6">
            <Link href="/documents" className={linkClass('/documents')}>
              Documents
            </Link>
            <Link href="/chat" className={linkClass('/chat')}>
              Chat
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-slate-400 hover:text-red-400 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  )
}

import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { ErrorBanner } from '../components/ErrorBanner'
import { LoadingSpinner } from '../components/LoadingSpinner'
import api from '../lib/api'
import { authStore } from '../lib/auth'
import type { AuthTokens } from '../lib/types'

type Stage = 'email' | 'otp'

const OTP_LENGTH = 6
const RESEND_COOLDOWN = 60

export default function LoginPage() {
  const router = useRouter()

  const [stage, setStage] = useState<Stage>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendCountdown, setResendCountdown] = useState(0)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (authStore.isAuthenticated()) {
      router.replace('/chat')
    }
  }, [router])

  function startResendCooldown() {
    setResendCountdown(RESEND_COOLDOWN)
    countdownRef.current = setInterval(() => {
      setResendCountdown((n) => {
        if (n <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current)
          return 0
        }
        return n - 1
      })
    }, 1000)
  }

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    try {
      await api.post('/auth/request-otp', { email: email.trim() })
      setStage('otp')
      startResendCooldown()
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to send OTP. Try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length !== OTP_LENGTH) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post<AuthTokens>('/auth/verify-otp', {
        email: email.trim(),
        otp: otp.trim(),
      })
      authStore.setTokens(data)
      router.push('/chat')
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { error?: { message?: string }; attempts_remaining?: number } }
      }
      const remaining = axiosError.response?.data?.attempts_remaining
      const base = axiosError.response?.data?.error?.message ?? 'Invalid or expired code.'
      setError(remaining !== undefined ? `${base} ${remaining} attempt(s) remaining.` : base)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (resendCountdown > 0 || loading) return
    setLoading(true)
    setError(null)
    try {
      await api.post('/auth/request-otp', { email: email.trim() })
      startResendCooldown()
      setOtp('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend OTP.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex w-[420px] shrink-0 bg-gradient-to-b from-slate-900 via-slate-900 to-blue-950 flex-col items-center p-9">
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <img src="/logo.png" alt="DocuMind AI" className="w-70 drop-shadow-2xl" />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight"></h1>
            <p className="text-blue-300 text-sm mt-2 leading-relaxed">
              Intelligent Document Assistant<br />for enterprise teams
            </p>
          </div>
        </div>
        <p className="text-slate-500 text-xs">
          © {new Date().getFullYear()} DocuMind AI.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-8 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex flex-col items-center lg:hidden">
            <img src="/logo.png" alt="DocuMind AI" className="w-24 mb-4" />
            <h1 className="text-2xl font-bold text-slate-900">DocuMind AI</h1>
            <p className="text-sm text-slate-500 mt-1">Intelligent Document Assistant</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            {stage === 'email' ? (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-900">Sign in</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Enter your email to receive a one-time code
                  </p>
                </div>

                {error && (
                  <div className="mb-4">
                    <ErrorBanner message={error} onDismiss={() => setError(null)} />
                  </div>
                )}

                <form onSubmit={handleRequestOtp} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="input-base"
                      disabled={loading}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><LoadingSpinner size="sm" /><span>Sending...</span></>
                    ) : (
                      'Continue'
                    )}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-900">Check your email</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    We sent a 6-digit code to{' '}
                    <strong className="text-slate-700">{email}</strong>
                  </p>
                </div>

                {error && (
                  <div className="mb-4">
                    <ErrorBanner message={error} onDismiss={() => setError(null)} />
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div>
                    <label htmlFor="otp" className="block text-sm font-medium text-slate-700 mb-1.5">
                      One-time code
                    </label>
                    <input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={OTP_LENGTH}
                      required
                      autoFocus
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                      placeholder="000000"
                      className="input-base text-center tracking-[0.5em] text-xl font-mono"
                      disabled={loading}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || otp.length !== OTP_LENGTH}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><LoadingSpinner size="sm" /><span>Verifying...</span></>
                    ) : (
                      'Verify & Sign in'
                    )}
                  </button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendCountdown > 0 || loading}
                      className="text-sm text-blue-600 hover:underline disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
                    >
                      {resendCountdown > 0
                        ? `Resend code in ${resendCountdown}s`
                        : 'Resend code'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

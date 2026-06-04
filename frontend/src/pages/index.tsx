import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { authStore } from '../lib/auth'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.replace(authStore.isAuthenticated() ? '/chat' : '/login')
  }, [router])

  return null
}

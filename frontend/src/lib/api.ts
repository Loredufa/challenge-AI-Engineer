import axios from 'axios'
import { authStore } from './auth'

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'}/api/v1`,
})

// Request interceptor: attach Bearer token
api.interceptors.request.use((config) => {
  const token = authStore.getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: on 401 try refresh → retry, then redirect to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const refreshToken = authStore.getRefreshToken()
        if (!refreshToken) throw new Error('No refresh token')
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'}/api/v1/auth/refresh`,
          { refreshToken }
        )
        authStore.setTokens(data)
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return api(originalRequest)
      } catch {
        authStore.clearTokens()
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  }
)

export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`/documents/${id}`)
}

export default api

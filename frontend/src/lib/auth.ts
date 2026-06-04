const ACCESS_TOKEN_KEY = 'documind_access_token'
const REFRESH_TOKEN_KEY = 'documind_refresh_token'

export const authStore = {
  setTokens(tokens: { accessToken: string; refreshToken: string }) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
  },
  getAccessToken(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem(ACCESS_TOKEN_KEY) : null
  },
  getRefreshToken(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null
  },
  clearTokens() {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },
  isAuthenticated(): boolean {
    return !!this.getAccessToken()
  },
}

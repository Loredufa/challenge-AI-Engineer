export interface User {
  id: string
  email: string
  emailVerifiedAt: Date | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

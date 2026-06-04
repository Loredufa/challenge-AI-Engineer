import { User } from '@domain/entities/user.entity'

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>
  upsertByEmail(email: string): Promise<{ user: User; isNew: boolean }>
  findById(id: string): Promise<User | null>
}

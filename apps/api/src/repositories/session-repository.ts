export interface SessionRecord {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface SessionRepository {
  findById(id: string): Promise<SessionRecord | undefined>;
  create(userId: string, expiresAt: string): Promise<SessionRecord>;
  delete(id: string): Promise<void>;
}

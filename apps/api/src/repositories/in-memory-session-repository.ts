import { randomUUID } from "node:crypto";
import type { SessionRecord, SessionRepository } from "./session-repository.js";

export class InMemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<string, SessionRecord>();
  async findById(id: string): Promise<SessionRecord | undefined> {
    const session = this.sessions.get(id);
    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
      if (session) this.sessions.delete(id);
      return undefined;
    }
    return session;
  }
  async create(userId: string, expiresAt: string): Promise<SessionRecord> {
    const session = {
      id: randomUUID(),
      userId,
      createdAt: new Date().toISOString(),
      expiresAt,
    };
    this.sessions.set(session.id, session);
    return session;
  }
  async delete(id: string): Promise<void> {
    this.sessions.delete(id);
  }
}

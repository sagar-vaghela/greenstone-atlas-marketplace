import { scryptSync } from "node:crypto";
import type { UserRole } from "@atlas/types";
import type {
  CreateUserInput,
  UserRecord,
  UserRepository,
} from "./user-repository.js";
import { normalizeEmail } from "./user-repository.js";

const demoHash = (password: string): string =>
  `demo:${scryptSync(password, "demo", 64).toString("hex")}`;

const demoUsers: UserRecord[] = [
  {
    id: "demo-seller",
    email: "seller@example.com",
    displayName: "Seller",
    role: "seller",
    passwordHash: demoHash("seller123"),
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "demo-buyer",
    email: "buyer@example.com",
    displayName: "Buyer A",
    role: "buyer",
    passwordHash: demoHash("buyer123"),
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "demo-seller-2",
    email: "seller2@example.com",
    displayName: "Daniel Shah",
    role: "seller",
    passwordHash: demoHash("seller123"),
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
  },
  {
    id: "demo-buyer-2",
    email: "buyer2@example.com",
    displayName: "Buyer B",
    role: "buyer",
    passwordHash: demoHash("buyer123"),
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
];

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map(demoUsers.map((user) => [user.id, user]));

  async findById(id: string): Promise<UserRecord | undefined> {
    return this.users.get(id);
  }
  async findByEmail(email: string): Promise<UserRecord | undefined> {
    return [...this.users.values()].find(
      (user) => user.email === normalizeEmail(email),
    );
  }
  async create(input: CreateUserInput): Promise<UserRecord> {
    const timestamp = new Date().toISOString();
    const user: UserRecord = {
      id: input.id ?? `user-${crypto.randomUUID()}`,
      email: normalizeEmail(input.email),
      displayName: input.displayName.trim(),
      role: input.role ?? ("buyer" satisfies UserRole),
      passwordHash: input.passwordHash,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateDisplayName(
    id: string,
    displayName: string,
  ): Promise<UserRecord | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = {
      ...user,
      displayName: displayName.trim(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set(id, updated);
    return { ...updated };
  }
}

import type { User, UserRole } from "@atlas/types";

export interface UserRecord extends User {
  passwordHash: string;
}

export interface CreateUserInput {
  id?: string;
  email: string;
  displayName: string;
  passwordHash: string;
  role?: UserRole;
}

export interface UserRepository {
  findById(id: string): Promise<UserRecord | undefined>;
  findByEmail(email: string): Promise<UserRecord | undefined>;
  create(input: CreateUserInput): Promise<UserRecord>;
  updateDisplayName(
    id: string,
    displayName: string,
  ): Promise<UserRecord | undefined>;
}

export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

export const toPublicUser = ({
  passwordHash: _passwordHash,
  ...user
}: UserRecord): User => user;

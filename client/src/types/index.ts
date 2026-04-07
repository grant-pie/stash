// ---------------------------------------------------------------------------
// Shared TypeScript types — mirrors the server entities
// ---------------------------------------------------------------------------

export type UserRole = 'user' | 'moderator' | 'admin';

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  isSuspended?: boolean;
  suspendedAt?: string | null;
  suspendReason?: string | null;
  createdAt?: string;
}

export interface Snippet {
  id: string;
  title: string;
  description: string | null;
  language: string;
  content: string;
  tags: string[];
  isPublic: boolean;
  userId: string;
  user?: { id: string; username: string }; // populated on public feed endpoints
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// API request/response shapes
// ---------------------------------------------------------------------------

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface CreateSnippetPayload {
  title: string;
  description?: string;
  language: string;
  content: string;
  tags?: string[];
  isPublic?: boolean;
}

export type UpdateSnippetPayload = Partial<CreateSnippetPayload>;

export interface SnippetFilters {
  search?: string;
  language?: string;
  tag?: string;
}

// ---------------------------------------------------------------------------
// Admin types
// ---------------------------------------------------------------------------

export interface AdminStats {
  totalUsers: number;
  totalSnippets: number;
  newUsersThisWeek: number;
  publicSnippets: number;
  suspendedUsers: number;
  topLanguages: { language: string; count: number }[];
}

export interface AuditLog {
  id: string;
  adminId: string | null;
  admin: Pick<User, 'id' | 'username'> | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminUser extends User {
  snippetCount: number;
}

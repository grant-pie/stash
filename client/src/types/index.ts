// ---------------------------------------------------------------------------
// Shared TypeScript types — mirrors the server entities
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  username: string;
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

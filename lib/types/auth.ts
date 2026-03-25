export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
}

export type AuthErrorPageCode =
  | "auth_error"
  | "invalid_or_expired_link"
  | "missing_or_invalid_link";

export interface SessionResponse {
  user: SessionUser | null;
}

export interface AuthActionResponse {
  user: SessionUser | null;
  message?: string;
  requiresEmailConfirmation?: boolean;
}

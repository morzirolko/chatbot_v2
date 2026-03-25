export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
}

export interface BrowserSessionUser extends SessionUser {
  isAnonymous: boolean;
}

export interface BrowserSessionResponse {
  user: BrowserSessionUser | null;
  isAnonymous: boolean;
  realtimeAccessToken: string | null;
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

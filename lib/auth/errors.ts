import type { AuthErrorPageCode } from "@/lib/types/auth";

export const AUTH_ERROR_PAGE_CODES = {
  authError: "auth_error",
  invalidOrExpiredLink: "invalid_or_expired_link",
  missingOrInvalidLink: "missing_or_invalid_link",
} as const satisfies Record<string, AuthErrorPageCode>;

const AUTH_ERROR_PAGE_MESSAGES: Record<AuthErrorPageCode, string> = {
  auth_error: "We could not complete that authentication request.",
  invalid_or_expired_link:
    "That sign-in or recovery link is invalid or has expired. Request a new one and try again.",
  missing_or_invalid_link:
    "That authentication link is incomplete or invalid. Request a new one and try again.",
};

export const AUTH_ERROR_MESSAGES = {
  forgotPassword:
    "If an account exists for that email, password reset instructions will be sent.",
  login: "Unable to sign in with those credentials.",
  logout: "Unable to sign out right now. Please try again.",
  signup: "Unable to create your account right now. Please try again.",
  updatePassword:
    "Unable to update your password right now. Please try again.",
} as const;

export function getAuthErrorPageMessage(code?: string) {
  if (!code) {
    return AUTH_ERROR_PAGE_MESSAGES.auth_error;
  }

  return AUTH_ERROR_PAGE_MESSAGES[
    code as AuthErrorPageCode
  ] ?? AUTH_ERROR_PAGE_MESSAGES.auth_error;
}

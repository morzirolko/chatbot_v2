import type { AuthActionResponse, SessionResponse } from "@/lib/types/auth";

async function readJsonResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Request failed.");
  }

  return payload as T;
}

export async function getSession() {
  const response = await fetch("/api/auth/session", {
    cache: "no-store",
  });

  return readJsonResponse<SessionResponse>(response);
}

export async function login({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  return readJsonResponse<AuthActionResponse>(response);
}

export async function signup({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const response = await fetch("/api/auth/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  return readJsonResponse<AuthActionResponse>(response);
}

export async function logout() {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
  });

  return readJsonResponse<AuthActionResponse>(response);
}

export async function forgotPassword(email: string) {
  const response = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  return readJsonResponse<AuthActionResponse>(response);
}

export async function updatePassword(password: string) {
  const response = await fetch("/api/auth/update-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });

  return readJsonResponse<AuthActionResponse>(response);
}

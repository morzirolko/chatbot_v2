import { readJsonResponse } from "@/lib/api/error";
import type {
  AuthActionResponse,
  BrowserSessionResponse,
} from "@/lib/types/auth";

async function postJson<T>(url: string, body?: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  return readJsonResponse<T>(response);
}

export async function getAuthSession() {
  const response = await fetch("/api/auth/session", {
    cache: "no-store",
  });

  return readJsonResponse<BrowserSessionResponse>(response);
}

export async function ensureAnonymousSession() {
  return postJson<BrowserSessionResponse>("/api/auth/anonymous-session");
}

export async function login({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  return postJson<AuthActionResponse>("/api/auth/login", {
    email,
    password,
  });
}

export async function signup({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  return postJson<AuthActionResponse>("/api/auth/signup", {
    email,
    password,
  });
}

export async function logout() {
  return postJson<AuthActionResponse>("/api/auth/logout");
}

export async function forgotPassword(email: string) {
  return postJson<AuthActionResponse>("/api/auth/forgot-password", {
    email,
  });
}

export async function updatePassword(password: string) {
  return postJson<AuthActionResponse>("/api/auth/update-password", {
    password,
  });
}

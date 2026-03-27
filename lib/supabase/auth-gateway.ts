import "server-only"

import { createClient } from "@supabase/supabase-js"
import type { EmailOtpType, Session, User } from "@supabase/supabase-js"

function createAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Missing Supabase publishable auth environment variables.")
  }

  return createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

export interface AuthenticatedGatewaySession {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: User
}

function mapAuthenticatedSession(session: Session | null) {
  if (
    !session?.access_token ||
    !session.refresh_token ||
    !session.expires_at ||
    !session.user
  ) {
    return null
  }

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at,
    user: session.user,
  } satisfies AuthenticatedGatewaySession
}

async function setClientSession(input: {
  accessToken: string
  refreshToken: string
}) {
  const supabase = createAuthClient()
  const { data, error } = await supabase.auth.setSession({
    access_token: input.accessToken,
    refresh_token: input.refreshToken,
  })

  if (error) {
    throw error
  }

  const session = mapAuthenticatedSession(data.session)

  if (!session) {
    throw new Error("Supabase Auth did not return a valid session.")
  }

  return { supabase, session }
}

export async function signInWithPassword(input: {
  email: string
  password: string
}) {
  const supabase = createAuthClient()
  const { data, error } = await supabase.auth.signInWithPassword(input)

  if (error) {
    throw error
  }

  return {
    user: data.user,
    session: mapAuthenticatedSession(data.session),
  }
}

export async function signUpWithPassword(input: {
  email: string
  password: string
  emailRedirectTo: string
}) {
  const supabase = createAuthClient()
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: input.emailRedirectTo,
    },
  })

  if (error) {
    throw error
  }

  return {
    user: data.user,
    session: mapAuthenticatedSession(data.session),
  }
}

export async function signInAnonymously() {
  const supabase = createAuthClient()
  const { data, error } = await supabase.auth.signInAnonymously()

  if (error) {
    throw error
  }

  const session = mapAuthenticatedSession(data.session)

  if (!session) {
    throw new Error("Anonymous sign-in did not return a session.")
  }

  return session
}

export async function verifyOtp(input: {
  tokenHash: string
  type: EmailOtpType
}) {
  const supabase = createAuthClient()
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: input.tokenHash,
    type: input.type,
  })

  if (error) {
    throw error
  }

  return {
    user: data.user,
    session: mapAuthenticatedSession(data.session),
  }
}

export async function resetPasswordForEmail(input: {
  email: string
  redirectTo: string
}) {
  const supabase = createAuthClient()
  const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
    redirectTo: input.redirectTo,
  })

  if (error) {
    throw error
  }
}

export async function refreshGatewaySession(input: {
  accessToken: string
  refreshToken: string
}) {
  const { session } = await setClientSession(input)
  return session
}

export async function updateGatewayUser(
  input: {
    accessToken: string
    refreshToken: string
  },
  attributes: {
    password?: string
  }
) {
  const { supabase, session } = await setClientSession(input)
  const { data, error } = await supabase.auth.updateUser(attributes)

  if (error) {
    throw error
  }

  return {
    user: data.user ?? session.user,
    session,
  }
}

export async function signOutGatewaySession(input: {
  accessToken: string
  refreshToken: string
}) {
  const { supabase } = await setClientSession(input)
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}

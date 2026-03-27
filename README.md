# Yet another API wrapper

A Next.js chat app with Supabase-backed auth, persisted conversation threads, file attachments, and streaming responses from multiple AI providers.

## What This Project Includes

- Guest chat with a 3-message free quota
- Email/password sign up, sign in, password reset, email confirmation, and Google OAuth
- Upgrade path from anonymous session to full account with chat history migration
- Threaded chat archive in the sidebar
- Streaming assistant responses over Server-Sent Events
- Model switching between OpenAI and Google AI models
- Attachments for images, PDFs, TXTs
- Supabase Storage for files, and Realtime for thread broadcasts

## Models

The UI currently exposes:

- `gpt-5.4` via OpenAI (I don't have API key, so model always return error)
- `gemini-2.5-flash` via Google AI (Also really limited key, so if it doesn't work you know why)
- `gemma-3-27b-it` via Google AI (Somewhat usable but super dumb)

Gemma-3 is the default selection. If you want a OpenAI model to be the default in a local setup, update `DEFAULT_CHAT_MODEL` in `lib/ai/providers.ts`.

## Tech Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- TanStack Query
- Supabase Auth, Postgres, Storage, and Realtime

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create your environment file

Copy `.env.example` to `.env.local` and fill in the values:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-api-key
GOOGLE_AI_API_KEY=your-google-ai-api-key
```

Notes:

- `SUPABASE_SERVICE_ROLE_KEY` is required because server routes use an admin client for chat persistence, attachment access, and storage operations.
- Keep `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, and `GOOGLE_AI_API_KEY` server-only.
- You only need to provide keys for the providers you plan to use, but the default UI model is Google.

### 3. Configure Supabase Auth

In your Supabase project:

- Enable Email auth for account sign-up and sign-in.
- Enable the Google provider if you want "Continue with Google" on the auth screens.
- Enable the Anonymous provider if you want guest chat to work.
- Enable realtime for chat_messages table

For Google OAuth, add your callback URL to the Supabase Auth redirect allow list:

- Local: `http://localhost:3000/auth/callback`
- Production: `https://your-domain.com/auth/callback`

Also make sure the Google OAuth app itself is configured with Supabase's callback URL as an authorized redirect URI:

- `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

If anonymous sign-ins are disabled, the authenticated account flows still work, but guest chat will be unavailable.

### 4. Apply the database migration

Run the SQL in [`supabase/migrations/202603271500_initial_schema.sql`](./supabase/migrations/202603271500_initial_schema.sql) against your Supabase project.

This migration creates:

- `chat_threads`
- `chat_messages`
- `chat_attachments`
- `user_usage`
- `app_sessions`
- the `chat-attachments` storage bucket
- helper functions for attachment linking, quota tracking, anonymous history migration, and Realtime topic access

There is no checked-in `supabase/config.toml` in this repo, so the simplest path is to apply the migration in the Supabase SQL editor or wire it into your own CLI workflow.

### 5. Start the app

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Attachment Support

Supported file types:

- Images: `jpg`, `jpeg`, `png`, `webp`
- Documents: `pdf`
- Text-like files: `txt`, `md`, `markdown`, `json`, `csv`

Current limits:

- Up to 5 attachments per message
- Images up to 8 MB
- PDFs up to 12 MB
- Text-like files up to 512 KB

PDF and text attachments are extracted into text before being sent to the model. Image attachments are forwarded as image input where the selected model supports it.

## Project Structure

- [`app`](./app): App Router pages and API routes
- [`components`](./components): chat UI, auth UI, and shared components
- [`hooks`](./hooks): client-side chat and auth hooks
- [`lib/auth`](./lib/auth): custom session management and upgrade flow
- [`lib/chat`](./lib/chat): thread, message, quota, and Realtime logic
- [`lib/attachments`](./lib/attachments): validation, extraction, storage, and access rules
- [`lib/openai`](./lib/openai) and [`lib/google`](./lib/google): provider-specific streaming integrations
- [`supabase/migrations`](./supabase/migrations): database schema

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Implementation Notes

- Chat responses stream from `/api/chat/messages` using SSE.
- Sessions are managed with an app-owned cookie plus records in `app_sessions`, rather than relying on the browser Supabase client to own long-lived auth state directly.
- Guest users can chat immediately, then upgrade to an account and migrate their chat history.
- Conversation lists and message history are persisted in Supabase and broadcast on per-thread Realtime topics.
- Currently you don't need to verify email (Default supabase limitation is 2 mails per day, so for display purposes i disabled it(don't do this) as i dont have time to add custom smtp)

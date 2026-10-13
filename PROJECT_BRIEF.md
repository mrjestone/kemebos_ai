# Kaizerege & Kemebos AI Assistant — Project Brief

Living document: decisions made during the planning interview. Update it every session so context carries over.

## Purpose
Graduation project (CS student). Goal is to **demonstrate knowledge**, so architecture and every layer must be explainable.
An AI assistant for a school (Kaizerege & Kemebos) that answers questions about how to do things and general info.
- Anyone (guests) can ask public questions, e.g. "When is parents day?".
- Approved members of the organization also get private answers.

## Decisions so far
- **Frontend:** Next.js, **JavaScript (no TypeScript)**, Tailwind CSS.
- **Backend:** Python, proposed FastAPI (to confirm).
- **Languages:** English and Kiswahili; the assistant answers in the language of the question.
- **Organization:** a school.
- **Auth:** seeded admin account; members sign up with email + password; status `pending` until the admin approves.
- **Access:** guests and pending users get public info only. Approved members also get private info. Admin manages users and knowledge.
- **Private data categories:** staff-only procedures, student-related info, finance/fees details, multiple member levels (staff vs students), plus an "other" category not yet specified.
- **Knowledge intake:** seed files first (user collects files externally). Later, an admin chat where the AI interviews the admin with guided questions and saves answers as entries tagged public/private.
- **LLM:** free tier APIs only (no local compute). Plan: Gemini primary + Groq fallback behind one interface; check live limits in each console before choosing the primary. Embeddings: Gemini embedding API (superseded the local-model idea; see Architecture). Free-tier numbers conflict between sources; verify.
- **Showcase emphasis:** architecture diagram and docs, security/access control, RAG pipeline internals (show retrieved sources under answers).

## Finalized decisions (interview round 3)
- **Deadline:** must be finished TODAY. Build and verify the system first; real school data is loaded LAST. Use generated sample data (EN + Kiswahili) while building.
- **Private/public categorization:** obvious ones private now (staff procedures, student info, finance); uncertain ones decided at data-loading time.
- **Roles:** guest, student, staff, admin. Students and staff may see different private docs (e.g. finance = staff + admin only).
- **Backend:** Flask (user's choice).
- **Deployment:** Vercel (default *.vercel.app URL, custom domain maybe later). Internet and cloud LLM required. No local-only setup.

## Architecture (Vercel-compatible)
- Two Vercel projects in a monorepo: `frontend/` (Next.js JS + Tailwind) and `backend/` (Flask serverless).
- Next.js `rewrites` proxy `/api/*` to the Flask URL so auth cookies are same-origin (httpOnly JWT cookie, no CORS pain).
- DB: free hosted Postgres (Neon) with **pgvector**: tables users, documents, chunks(embedding vector, access_level). No SQLite or Chroma (serverless has no persistent disk).
- Embeddings: Gemini embedding API (multilingual, free). Chat LLM: Gemini primary + Groq fallback behind one provider interface. (Groq has no embeddings; embeddings depend on Gemini.)
- RAG: chunk -> embed -> store with access tag; query embed -> pgvector similarity search **filtered by the caller's role in SQL before anything reaches the LLM** -> prompt with retrieved chunks -> answer in user's language with cited sources.
- **Streaming: REQUIRED.** Flask streams SSE tokens. RISK: Vercel/Next proxy may buffer; test streaming end-to-end FIRST. Fallback: browser calls Flask directly for the chat stream (bearer token + CORS).
- Serverless caveat: function timeouts, so keep prompts/contexts small.
- Seed script loads sample docs and creates the admin.

## Open items
- Accounts/keys needed: Vercel, Neon, Gemini (AI Studio) key, Groq key.
- Check live free-tier limits in each console before picking the primary chat model.

## Scope (final)
- IN: public chat with streaming + cited sources, in-conversation memory (client-held, cleared on refresh), signup/login, admin approval, admin page (approve/reject users, upload/tag docs, manage roles), role-filtered RAG, EN + Kiswahili, Vercel deploy, architecture docs.
- CUT: AI-interviews-the-admin feature, saved chat history (per-user stored conversations; maybe stretch), Google sign-in.

## Progress log
- UI-first phase: whole frontend built on MOCK data before any backend/keys. Design approved: borderless, filled inputs, crest palette (red primary, gold user bubbles, sky-blue AI/accents), centred Brand lockup. Logo = transparent public/logo.png (cut from the 105x142 JPG; ask for a higher-res original).
- DONE (frontend/): /login, /signup (shared `app/(auth)/layout.js`, components/auth/*), /chat (components/chat/*, streaming mock, source chips, guest/student/staff access demo).
- Mock layer to replace with real API later: lib/mockSession.js (localStorage), lib/mockKnowledge.js (KB + answerQuestion), mockLogin/mockSignup in the forms, mockStream in ChatApp.
- Mock rules: email containing "admin"/"staff" -> that role, else student; "pending" in email -> awaiting approval; "wrong" in password -> error.
- TODO: /admin pages (approve/reject users, upload/tag docs, manage roles), then backend (Flask), Neon+pgvector, LLM, deploy, architecture docs.
- Dev tips: dev server `npm run dev` in frontend/. Headless screenshots/interaction via Chrome (CDP script was in the scratchpad).
- DONE: /admin (guard: admin only; Overview, Approvals w/ role select + Undo toast, Users w/ search/filters/role change/suspend, Documents w/ public|student|staff tag, drag-drop upload, 4-stage pipeline progress, remove w/ undo). State in components/admin/AdminProvider.js (mock; each action = a future Flask endpoint). Seed data in lib/mockAdminData.js.
- Note: Next 16 cacheComponents keeps previously visited routes mounted (hidden) so tests must count only visible elements.
- Chat fixes done: whole-word keyword matching, `/` -> /chat, profile menu in header, mobile polish.
- STILL TODO (frontend): chat New-chat/copy/error+retry/pending banner, RAG inspector panel, "How it works" page, 404 page. THEN backend.

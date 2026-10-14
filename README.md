<p align="center"><img src="public/logo.png" alt="Kemebos crest" width="105"></p>

# Kaizerege & Kemebos AI Assistant

A bilingual (English / Kiswahili) assistant for a school. Anyone can ask public questions; approved members get private answers. Built to demonstrate a full retrieval-augmented-generation (RAG) system with role-based access control.

See the in-app page **/how-it-works** for the architecture in pictures.

## Stack
- **Frontend:** Next.js (JavaScript) + Tailwind CSS: `app/`, `components/`, `lib/`
- **API:** FastAPI (Python): `backend/` (entry for Vercel: `api/index.py`)
- **Database:** MongoDB Atlas (users, documents, vector chunks) via PyMongo
- **AI:** Gemini (embeddings + chat), Groq as fallback chat
- **Hosting:** Vercel (`vercel.json` routes `/api/*` to the Python function)

## How a question is answered
1. The question is embedded (Gemini) into a 768-number vector.
2. Atlas Vector Search finds the closest chunks **filtered by the caller's access level inside the search**, so restricted text is never retrieved.
3. The chunks go to the chat model with strict instructions to answer only from them.
4. The answer streams back (server-sent events) with its sources.

Access levels: `public < student < staff < admin`. Guests see public only. Accounts start `pending` until an admin approves them.

## Run locally
```bash
cp .env.example .env.local        # then fill in real values (never commit .env.local)
python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
npm install

# 1. load the sample knowledge + create the admin + vector index (needs MONGODB_URI)
.venv/bin/python -m scripts.seed

# 2. API (http://127.0.0.1:8000, docs at /api/docs)
.venv/bin/python -m uvicorn backend.main:app --port 8000

# 3. website (http://localhost:3000, proxies /api to the API)
npm run dev
```
No Atlas yet? `python -m scripts.dev_local` runs the API against an in-memory database seeded with the sample data (accounts `admin@`, `staff@`, `student@school.org`, password `Passw0rd!`).

Offline demo fallback: set `NEXT_PUBLIC_USE_MOCK=true` to run the website on built-in mock data with no backend.

## Tests
```bash
.venv/bin/python -m pytest        # 28 tests, no network (in-memory database, fake model)
```

## Knowledge base
Admins add knowledge in **Admin → Knowledge**: upload JSON / Markdown / text / PDF / Word (up to 4 MB) or write an entry. JSON format:
```json
[{ "title": "Parents Day", "access": "public", "content": "Parents Day is held on..." }]
```
Sample data lives in `data/knowledge.json`.

## Environment variables
See `.env.example`. On Vercel set the same variables (without quotes) and set `NEXT_PUBLIC_USE_MOCK=false`.

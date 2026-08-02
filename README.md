# StudyMate AI — vanilla HTML/CSS/JS version

A plain HTML/CSS/JS build of StudyMate AI — no framework, no build step. Open `index.html` in a browser and it runs.

## Files

- `index.html` — page structure: login screen, sidebar, dashboard, chat, notes, quiz, settings.
- `style.css` — all styling, including dark/light theme variables and mobile layout.
- `script.js` — app logic. Chat, Notes, and Quiz Generator call a real AI model live via `fetch`.

## What's real vs. mocked

**Real:** Chat, Smart Notes, and Quiz Generator all make live calls to Claude and render actual responses — try any topic.

**Mocked (front-end demo only):**
- Login accepts anything and doesn't create a real account.
- Chat history, notes, and quiz scores live in memory only — refreshing the page clears them.
- No PDF upload, OCR, voice, or multi-language switching yet.

## Running it

Just open `index.html` directly, or serve the folder locally:

```bash
cd studymate-vanilla
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Moving to production

This calls the AI API directly from the browser, which is fine for a demo but exposes no API key here (none is hardcoded) — in a real deployment, route these calls through a backend instead, so any API key stays server-side. See the companion FastAPI backend (`studymate-backend/`) from the earlier drop for a ready-made `/api/chat`, `/api/notes`, `/api/quiz` you can point `script.js` at — just swap the `askClaude()` function to `fetch('/api/chat', ...)`.

/* ---------------------------------------------------------
   StudyMate AI — vanilla JS demo
   Chat, Notes, and Quiz call a real Claude completion via
   the browser fetch API. Auth and history persistence are
   mocked — see README.md.
--------------------------------------------------------- */

const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science",
  "Data Structures", "Python", "Web Development", "Electronics", "Aptitude",
];

const state = {
  user: null,
  level: "Intermediate",
  chats: [{ id: "1", title: "New chat", messages: [] }],
  activeChatId: "1",
};

async function askClaude(prompt, system) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: system || undefined,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = (data.content || [])
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n")
    .trim();
  return text || "Sorry — I couldn't generate a response just now.";
}

/* ---------------- Login ---------------- */
document.getElementById("login-btn").addEventListener("click", login);
document.getElementById("login-google-btn").addEventListener("click", login);

function login() {
  const name = document.getElementById("login-name").value.trim() || "Student";
  state.user = name;
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  document.getElementById("user-name").textContent = name;
  document.getElementById("dash-name").textContent = name;
  document.getElementById("settings-name").textContent = name;
  const initial = name[0].toUpperCase();
  document.getElementById("avatar").textContent = initial;
  document.getElementById("avatar-big").textContent = initial;
  renderSubjects();
  renderChatList();
}

document.getElementById("logout-btn").addEventListener("click", () => {
  state.user = null;
  document.getElementById("app").classList.add("hidden");
  document.getElementById("login-screen").classList.remove("hidden");
});

/* ---------------- Theme ---------------- */
document.getElementById("theme-toggle").addEventListener("click", () => {
  const isDark = document.body.classList.contains("dark");
  document.body.classList.toggle("dark", !isDark);
  document.body.classList.toggle("light", isDark);
  document.getElementById("theme-toggle").textContent = isDark ? "☀️ Dark mode" : "🌙 Light mode";
});

/* ---------------- Navigation ---------------- */
function setView(view) {
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  document.getElementById(`view-${view}`).classList.remove("hidden");
  document.querySelectorAll(".nav-item[data-view]").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  document.querySelectorAll(".mnav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  document.getElementById("chat-sidebar").classList.toggle("hidden", view !== "chat");
}
document.querySelectorAll("[data-view]").forEach((el) => {
  el.addEventListener("click", () => setView(el.dataset.view));
});

/* ---------------- Dashboard ---------------- */
function renderSubjects() {
  const wrap = document.getElementById("subject-chips");
  wrap.innerHTML = SUBJECTS.map((s) => `<span class="chip">${s}</span>`).join("");
}

/* ---------------- Chat ---------------- */
function activeChat() {
  return state.chats.find((c) => c.id === state.activeChatId);
}

function renderChatList() {
  const list = document.getElementById("chat-list");
  list.innerHTML = state.chats
    .map((c) => `<button class="chat-list-item ${c.id === state.activeChatId ? "active" : ""}" data-chat-id="${c.id}">${c.title}</button>`)
    .join("");
  document.getElementById("stat-chats").textContent = state.chats.length;
  list.querySelectorAll("[data-chat-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeChatId = btn.dataset.chatId;
      renderChatList();
      renderMessages();
    });
  });
}

function renderMessages() {
  const wrap = document.getElementById("chat-messages");
  const chat = activeChat();
  if (!chat.messages.length) {
    wrap.innerHTML = `<div class="chat-empty"><div class="chat-empty-icon">✨</div><p class="muted">Ask about any subject — math, code, science, and more.</p></div>`;
    return;
  }
  wrap.innerHTML = chat.messages
    .map((m) => `<div class="msg-row ${m.role}"><div class="msg-bubble">${escapeHtml(m.content)}</div></div>`)
    .join("");
  wrap.scrollTop = wrap.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

document.getElementById("new-chat-btn").addEventListener("click", () => {
  const id = String(Date.now());
  state.chats.unshift({ id, title: "New chat", messages: [] });
  state.activeChatId = id;
  renderChatList();
  renderMessages();
});

document.getElementById("chat-send").addEventListener("click", sendChat);
document.getElementById("chat-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendChat();
  }
});

async function sendChat() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";

  const chat = activeChat();
  chat.messages.push({ role: "user", content: text });
  if (chat.title === "New chat") chat.title = text.slice(0, 40);
  renderChatList();
  renderMessages();

  const wrap = document.getElementById("chat-messages");
  wrap.insertAdjacentHTML("beforeend", `<div class="msg-row thinking" id="thinking-row"><div class="msg-bubble"><span class="loading-spinner"></span>Thinking…</div></div>`);
  wrap.scrollTop = wrap.scrollHeight;

  const system = `You are StudyMate AI, a friendly study tutor. Explain things at a ${state.level} level. Use clear formatting and short paragraphs.`;
  const prompt = chat.messages.map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`).join("\n\n");
  const reply = await askClaude(prompt, system);

  document.getElementById("thinking-row")?.remove();
  chat.messages.push({ role: "assistant", content: reply });
  renderMessages();
}

/* ---------------- Notes ---------------- */
document.getElementById("notes-generate").addEventListener("click", generateNotes);
document.getElementById("notes-topic").addEventListener("keydown", (e) => e.key === "Enter" && generateNotes());

async function generateNotes() {
  const topic = document.getElementById("notes-topic").value.trim();
  if (!topic) return;
  const btn = document.getElementById("notes-generate");
  const output = document.getElementById("notes-output");
  btn.disabled = true;
  btn.innerHTML = `<span class="loading-spinner"></span>Generating…`;
  output.classList.add("hidden");

  const prompt = `Create study notes on "${topic}". Include: Definition, Introduction, Explanation, Key Concepts, Examples, Applications, Advantages, Disadvantages, Important Formulas (if applicable), Exam Tips, and a short Summary. Use markdown headings for each section.`;
  const notes = await askClaude(prompt, "You are StudyMate AI, generating clear, exam-ready study notes for students.");

  output.innerHTML = `<button class="copy-btn" id="copy-notes">📋 Copy</button>${escapeHtml(notes)}`;
  output.classList.remove("hidden");
  document.getElementById("copy-notes").addEventListener("click", () => navigator.clipboard?.writeText(notes));

  btn.disabled = false;
  btn.innerHTML = "✨ Generate";
}

/* ---------------- Quiz ---------------- */
document.getElementById("quiz-generate").addEventListener("click", generateQuiz);
document.getElementById("quiz-topic").addEventListener("keydown", (e) => e.key === "Enter" && generateQuiz());

let quizState = { questions: [], answers: {}, submitted: false };

async function generateQuiz() {
  const topic = document.getElementById("quiz-topic").value.trim();
  if (!topic) return;
  const btn = document.getElementById("quiz-generate");
  const output = document.getElementById("quiz-output");
  btn.disabled = true;
  btn.innerHTML = `<span class="loading-spinner"></span>Generating…`;
  output.innerHTML = "";

  const prompt = `Create a 5-question multiple choice quiz on "${topic}" for a student. Respond ONLY with valid JSON, no preamble, no markdown fences, in this exact shape:
{"questions":[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]}`;
  const raw = await askClaude(prompt, "You output only valid JSON matching the requested schema.");

  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    quizState = { questions: parsed.questions || [], answers: {}, submitted: false };
  } catch {
    quizState = { questions: [], answers: {}, submitted: false };
  }

  renderQuiz();
  btn.disabled = false;
  btn.innerHTML = "🧠 Generate";
}

function renderQuiz() {
  const output = document.getElementById("quiz-output");
  if (!quizState.questions.length) {
    output.innerHTML = `<p class="muted">Couldn't generate that quiz — try a different topic.</p>`;
    return;
  }

  output.innerHTML = quizState.questions
    .map((q, i) => {
      const options = q.options
        .map((opt, oi) => {
          const selected = quizState.answers[i] === oi;
          const correct = quizState.submitted && oi === q.correctIndex;
          const wrong = quizState.submitted && selected && oi !== q.correctIndex;
          const cls = ["quiz-option", selected && "selected", correct && "correct", wrong && "wrong"].filter(Boolean).join(" ");
          return `<button class="${cls}" data-q="${i}" data-o="${oi}" ${quizState.submitted ? "disabled" : ""}>${correct ? "✓ " : ""}${escapeHtml(opt)}</button>`;
        })
        .join("");
      const explanation = quizState.submitted ? `<div class="quiz-explanation">${escapeHtml(q.explanation)}</div>` : "";
      return `<div class="quiz-card"><div class="quiz-question">${i + 1}. ${escapeHtml(q.question)}</div>${options}${explanation}</div>`;
    })
    .join("");

  if (!quizState.submitted) {
    output.insertAdjacentHTML("beforeend", `<button id="quiz-submit" class="btn-primary">Submit answers</button>`);
    document.getElementById("quiz-submit").addEventListener("click", () => {
      quizState.submitted = true;
      renderQuiz();
    });
  } else {
    const score = quizState.questions.reduce((acc, q, i) => acc + (quizState.answers[i] === q.correctIndex ? 1 : 0), 0);
    output.insertAdjacentHTML("beforeend", `<div class="quiz-score">Score: ${score} / ${quizState.questions.length}</div>`);
  }

  output.querySelectorAll(".quiz-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      quizState.answers[btn.dataset.q] = Number(btn.dataset.o);
      renderQuiz();
    });
  });
}

/* ---------------- Settings ---------------- */
document.querySelectorAll("#level-buttons .pill").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.level = btn.dataset.level;
    document.querySelectorAll("#level-buttons .pill").forEach((b) => b.classList.toggle("active", b === btn));
  });
});

// ----- Telegram WebApp fallback -----
let tg = (window.Telegram && window.Telegram.WebApp) || null;

// Если открыто НЕ внутри Telegram — создаём мягкий фолбэк,
// чтобы приложение работало и в обычном браузере (dev-режим).
if (!tg) {
  console.warn("Telegram WebApp не найден — запущено в dev-режиме.");
  const stub = {
    colorScheme: "dark",
    themeParams: {},
    ready() {},
    expand() {},
    openInvoice: null,
    HapticFeedback: { impactOccurred() {} },
    MainButton: { show() {}, hide() {}, setText() {} },
    initData: "" // сервер увидит пустую строку — это ок для dev
  };
  window.Telegram = { WebApp: stub };
  tg = window.Telegram.WebApp;
}

tg.ready?.();
tg.expand?.();

// ----- Состояние -----
const state = { me: null, tasks: [], habits: [], goals: [] };

// ----- Табы -----
const tabs = document.querySelectorAll(".tabs button");
const sections = document.querySelectorAll(".tab");
tabs.forEach((btn) =>
  btn.addEventListener("click", () => {
    tabs.forEach((b) => b.classList.remove("active"));
    sections.forEach((s) => s.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  })
);

// ----- API helper -----
function initHeaders() {
  const initData = tg?.initData || "";
  return {
    "Content-Type": "application/json",
    "x-telegram-init-data": initData
  };
}
async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { ...initHeaders(), ...(options.headers || {}) }
  });
  if (!res.ok) {
    let msg = "";
    try {
      msg = await res.text();
    } catch (_) {}
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.json();
}

function setPROBadge() {
  document.getElementById("proBadge").textContent =
    state.me?.is_premium ? "PRO" : "FREE";
}

// ----- Рендеры -----
function renderTasks() {
  const list = document.getElementById("taskList");
  list.innerHTML = "";
  state.tasks.forEach((t) => {
    const li = document.createElement("li");
    li.className = "item";

    const ch = document.createElement("input");
    ch.type = "checkbox";
    ch.checked = !!t.done;

    const span = document.createElement("span");
    span.textContent = t.title;
    if (t.done) span.style.textDecoration = "line-through";

    ch.addEventListener("change", async () => {
      await api(`/api/tasks/${t.id}/toggle`, { method: "POST", body: "{}" });
      loadAll();
    });

    li.append(ch, span);
    list.append(li);
  });
}

function renderHabits() {
  const list = document.getElementById("habitList");
  list.innerHTML = "";
  state.habits.forEach((h) => {
    const li = document.createElement("li");
    li.className = "item";

    const span = document.createElement("span");
    span.textContent = `${h.title} — 🔥 серия: ${h.streak}`;

    const btn = document.createElement("button");
    btn.textContent = "+ день";
    btn.addEventListener("click", async () => {
      await api(`/api/habits/${h.id}/tick`, { method: "POST", body: "{}" });
      loadAll();
    });

    li.append(span, btn);
    list.append(li);
  });
}

function renderGoals() {
  const list = document.getElementById("goalList");
  list.innerHTML = "";
  state.goals.forEach((g) => {
    const li = document.createElement("li");
    li.className = "item";

    const span = document.createElement("span");
    const pct = Math.min(100, Math.round((g.progress / g.target) * 100));
    span.textContent = `${g.title} — ${pct}%`;

    const inc = document.createElement("button");
    inc.textContent = "+";
    inc.addEventListener("click", async () => {
      const next = Math.min(g.target, g.progress + Math.ceil(g.target / 10));
      await api(`/api/goals/${g.id}/update`, {
        method: "POST",
        body: JSON.stringify({ progress: next })
      });
      loadAll();
    });

    li.append(span, inc);
    list.append(li);
  });
}

const quotes = [
  "Маленькие шаги каждый день побеждают рывки раз в месяц.",
  "Дисциплина — это делать, когда не хочется.",
  "Фокус на процессе рождает результат."
];
function renderQuote() {
  document.getElementById("quote").textContent =
    quotes[Math.floor(Math.random() * quotes.length)];
}

// ----- Загрузка -----
async function loadAll() {
  state.me = (await api("/api/me")).user;
  setPROBadge();

  state.tasks = (await api("/api/tasks")).items;
  renderTasks();

  state.habits = (await api("/api/habits")).items;
  renderHabits();

  state.goals = (await api("/api/goals")).items;
  renderGoals();

  renderQuote();
}

// ----- События -----
document.getElementById("addTask").addEventListener("click", async () => {
  const input = document.getElementById("taskInput");
  const title = input.value.trim();
  if (!title) return;
  await api("/api/tasks", { method: "POST", body: JSON.stringify({ title }) });
  input.value = "";
  loadAll();
});

document.getElementById("addHabit").addEventListener("click", async () => {
  const input = document.getElementById("habitInput");
  const title = input.value.trim();
  if (!title) return;
  await api("/api/habits", { method: "POST", body: JSON.stringify({ title }) });
  input.value = "";
  loadAll();
});

document.getElementById("addGoal").addEventListener("click", async () => {
  const title = document.getElementById("goalInput").value.trim();
  const target = parseInt(
    document.getElementById("goalTarget").value || "100",
    10
  );
  if (!title) return;
  await api("/api/goals", {
    method: "POST",
    body: JSON.stringify({ title, target })
  });
  document.getElementById("goalInput").value = "";
  document.getElementById("goalTarget").value = "";
  loadAll();
});

// Покупка PRO (через Stars / invoice link)
document.getElementById("buyPro").addEventListener("click", async () => {
  try {
    const r = await api("/api/subscription/invoice", {
      method: "POST",
      body: "{}"
    });
    if (r.ok && r.link && tg?.openInvoice) {
      tg.openInvoice(r.link, (status) => {
        if (status === "paid") setTimeout(loadAll, 1000);
      });
    } else {
      alert("Не удалось открыть платёж");
    }
  } catch (e) {
    alert("Ошибка оплаты: " + e.message);
  }
});

// Стартовая загрузка
loadAll();

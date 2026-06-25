const temperatureLocations = [
  ...Array.from({ length: 10 }, (_, index) => `Display Chiller ${index + 1}`),
  "Milk Chiller",
  "Drinks Chiller",
  "Sandwich Chiller",
  "Stock Room Chiller",
  ...Array.from({ length: 10 }, (_, index) => `Freezer ${index + 1}`),
  "Ice Cream Freezer",
  "Stock Room Freezer",
];

const icons = {
  store: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l1-5h16l1 5"/><path d="M5 9v10h14V9"/><path d="M9 19v-6h6v6"/></svg>',
  home: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>',
  tasks: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l2 2 4-5"/><path d="M5 4h14v16H5z"/></svg>',
  temp: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 14.8V5a4 4 0 0 0-8 0v9.8a6 6 0 1 0 8 0z"/><path d="M10 9v7"/></svg>',
  visitor: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-8 0v2"/><circle cx="12" cy="7" r="4"/></svg>',
  age: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h5M7 13h3M15 13h2"/></svg>',
  post: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 8l9 6 9-6"/></svg>',
  reports: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h9l3 3v15H6z"/><path d="M9 14h6M9 10h6"/></svg>',
  team: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-8 0v2"/><circle cx="12" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M2 21v-2a4 4 0 0 1 3-3.87"/></svg>',
};

let catalog = { stores: [], staff: [], suppliers: [] };
let state = {
  token: localStorage.getItem("retailOpsToken") || "",
  currentUser: null,
  currentStoreId: "",
  activeView: "dashboard",
  records: null,
  toast: "",
  loading: true,
};

function currentStore() {
  return catalog.stores.find((store) => store.id === state.currentStoreId) || catalog.stores[0] || { name: "" };
}

function currentUser() {
  return state.currentUser || catalog.staff[0] || { name: "", role: "", initials: "", postOffice: false };
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      state.token = "";
      state.currentUser = null;
      localStorage.removeItem("retailOpsToken");
    }
    throw new Error(body.message || "Something went wrong");
  }
  return body;
}

async function init() {
  try {
    catalog = await api("/api/bootstrap");
    if (state.token) {
      applyPayload(await api("/api/state"));
    }
  } catch {
    state.token = "";
    localStorage.removeItem("retailOpsToken");
  } finally {
    state.loading = false;
    render();
  }
}

function applyPayload(payload) {
  state.currentUser = payload.user || state.currentUser;
  state.currentStoreId = payload.storeId || state.currentStoreId;
  state.records = payload.records || state.records;
}

function render() {
  const app = document.getElementById("app");
  if (state.loading) {
    app.innerHTML = `<main class="login-wrap"><section class="login-panel"><div class="brand"><span class="brand-mark">${icons.store}</span><span>Retail Ops</span></div><p>Loading secure staff app...</p></section></main>`;
    return;
  }
  if (!state.currentUser || !state.records) {
    app.innerHTML = renderLogin();
    bindLogin();
    return;
  }
  app.innerHTML = renderShell();
  bindApp();
}

function renderLogin() {
  const staffOptions = catalog.staff.map((person) => `<option value="${person.id}">${person.name} - ${person.role}</option>`).join("");
  const storeOptions = catalog.stores.map((store) => `<option value="${store.id}">${store.name}</option>`).join("");
  return `
    <main class="login-wrap">
      <section class="login-panel">
        <div class="brand"><span class="brand-mark">${icons.store}</span><span>Retail Ops</span></div>
        <h1>Staff operations for every store shift</h1>
        <p>Sign in with a staff PIN to complete store checks, temperature logs, visitor records, age-check logs, and Post Office duties.</p>
        <form id="loginForm">
          <div class="field"><label for="staffSelect">Staff member</label><select class="select" id="staffSelect">${staffOptions}</select></div>
          <div class="field"><label for="storeSelect">Store</label><select class="select" id="storeSelect">${storeOptions}</select></div>
          <div class="field"><label for="pinInput">Staff PIN</label><input class="input" id="pinInput" type="password" inputmode="numeric" maxlength="6" placeholder="Enter staff PIN" required></div>
          <button class="primary-btn" type="submit">${icons.home} Login</button>
        </form>
        <div class="login-note">PINs are checked on the server now, so they are no longer stored in the page code.</div>
      </section>
      <section class="login-visual" aria-hidden="true">
        <div class="preview-board">
          <div class="preview-row">
            <div class="preview-card">Tasks<strong>8/12</strong><small class="muted">Completed today</small></div>
            <div class="preview-card">Temperature<strong>2/2</strong><small class="muted">Logs complete</small></div>
            <div class="preview-card">Age Checks<strong>5</strong><small class="muted">Today</small></div>
          </div>
          <div class="preview-list"><div class="mini-line"></div><div class="mini-line"></div><div class="mini-line"></div></div>
        </div>
      </section>
    </main>`;
}

function bindLogin() {
  document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({
          staffId: document.getElementById("staffSelect").value,
          storeId: document.getElementById("storeSelect").value,
          pin: document.getElementById("pinInput").value,
        }),
      });
      state.token = payload.token;
      localStorage.setItem("retailOpsToken", state.token);
      applyPayload(payload);
      render();
    } catch (error) {
      alert(error.message);
    }
  });
}

function renderShell() {
  const user = currentUser();
  const nav = [
    ["dashboard", "Dashboard", icons.home],
    ["tasks", "Tasks", icons.tasks],
    ["temperature", "Temperature Check", icons.temp],
    ["visitors", "Visitor Log", icons.visitor],
    ["age", "Age Check Log", icons.age],
    ...(user.postOffice ? [["post", "Post Office Duties", icons.post]] : []),
    ["reports", "Logs & Reports", icons.reports],
    ["team", "Team", icons.team],
  ];

  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand"><span class="brand-mark">${icons.store}</span><span>Retail Ops</span></div>
        <nav class="nav">${nav.map(([id, label, icon]) => `<button class="${state.activeView === id ? "active" : ""}" data-view="${id}">${icon}<span>${label}</span></button>`).join("")}</nav>
        <div class="store-block"><h3>Stores</h3><div class="store-list">${catalog.stores.map((store, index) => `<button class="${state.currentStoreId === store.id ? "active" : ""}" data-store="${store.id}"><strong>${index + 1}</strong> ${store.name}</button>`).join("")}</div></div>
        <div class="user-strip"><span class="avatar">${user.initials}</span><div><strong>${user.name}</strong><br><small>${user.role}</small></div></div>
      </aside>
      <main class="main">
        <header class="topbar">
          <div class="topbar-left"><span class="select-pill">${icons.store} ${currentStore().name}</span><span class="select-pill"><span class="dot"></span> Shift: Morning Shift</span></div>
          <div class="topbar-right"><span class="time-pill">Time In: <span class="ok">07:00</span></span><button class="secondary-btn" data-action="break">Start Break</button><button class="secondary-btn" data-action="logout">Logout</button></div>
        </header>
        <section class="content"><div>${renderCurrentView()}</div>${renderActivityPanel()}</section>
      </main>
      ${state.toast ? `<div class="toast">${state.toast}</div>` : ""}
    </div>`;
}

function renderCurrentView() {
  if (state.activeView === "dashboard") return renderDashboard();
  if (state.activeView === "tasks") return renderTaskPage();
  if (state.activeView === "temperature") return renderLogPage("Temperature Check", renderTemperatureForm(), renderTemperatureTable());
  if (state.activeView === "visitors") return renderLogPage("Visitor Log", renderVisitorForm(), renderVisitorTable());
  if (state.activeView === "age") return renderLogPage("Age Check Log", renderAgeForm(), renderAgeTable());
  if (state.activeView === "post") return renderLogPage("Post Office Duties", renderPostForm(), renderPostTable());
  if (state.activeView === "reports") return renderReports();
  if (state.activeView === "team") return renderTeam();
  return renderDashboard();
}

function renderDashboard() {
  return `${renderStats()}<div class="grid">${renderTasksPanel()}${renderTemperaturePanel()}${renderQuickLogPanel()}${renderVisitorPanel()}${renderAgePanel()}${renderPostPanel()}</div>`;
}

function renderStats() {
  const records = state.records;
  const completed = records.tasks.filter((task) => task.done).length;
  const overdue = records.tasks.filter((task) => task.overdue && !task.done).length;
  const approved = records.ageChecks.filter((check) => check.outcome === "Approved").length;
  const postDone = records.postOfficeLogs.filter((log) => log.status === "Completed").length;
  const statData = [
    ["Tasks", `${completed} / ${records.tasks.length}`, "Completed", icons.tasks, "var(--green)", (completed / records.tasks.length) * 100],
    ["Overdue", overdue, "Require attention", "!", "var(--red)", overdue ? 25 : 0],
    ["Temperature", records.temperatures.length, "Logs today", icons.temp, "var(--green)", 80],
    ["Visitors", records.visitors.length, "Today", icons.visitor, "var(--blue)", 60],
    ["Age Checks", approved + records.ageChecks.filter((c) => c.outcome === "Refused").length, "Today", icons.age, "var(--amber)", 72],
    ["Post Office", `${postDone} / ${records.postOfficeLogs.length}`, "Completed", icons.post, "var(--blue)", (postDone / records.postOfficeLogs.length) * 100],
  ];
  return `<div class="stats">${statData.map(([label, value, sub, icon, color, progress]) => `<article class="stat"><div class="stat-top"><span class="stat-icon" style="background:${color}">${icon}</span><div>${label}<br><strong>${value}</strong></div></div><span>${sub}</span><div class="progress"><i style="width:${progress}%"></i></div></article>`).join("")}</div>`;
}

function renderTasksPanel(limit = 10) {
  return `<section class="panel"><div class="panel-head"><h2>Today's Tasks</h2><button class="ghost-btn" data-view="tasks">View all</button></div><div class="task-list">${state.records.tasks.slice(0, limit).map(renderTaskRow).join("")}</div></section>`;
}

function renderTaskRow(task) {
  const status = task.done ? `<span class="status ok">Completed ${task.due}</span>` : task.overdue ? `<span class="status danger">Overdue</span>` : `<span class="status warn">Due ${task.due}</span>`;
  return `<div class="task-row"><button class="check ${task.done ? "done" : ""}" data-task="${task.id}" aria-label="Toggle ${task.title}">${task.done ? "✓" : ""}</button><span>${task.title}</span>${status}</div>`;
}

function renderTemperaturePanel() {
  return `<section class="panel"><div class="panel-head"><h2>Temperature Check</h2><button class="ghost-btn" data-view="temperature">View log</button></div><div class="panel-body">${renderTemperatureForm()}</div></section>`;
}

function renderQuickLogPanel() {
  const buttons = [["temperature", "Log Temperature", icons.temp], ["visitors", "Log Visitor", icons.visitor], ["age", "Log Age Check / Refusal", icons.age], ...(currentUser().postOffice ? [["post", "Post Office Duty", icons.post]] : [])];
  return `<section class="panel"><div class="panel-head"><h2>Quick Log</h2></div><div class="panel-body quick-grid">${buttons.map(([view, label, icon]) => `<button class="quick-btn" data-view="${view}">${icon}${label}</button>`).join("")}<button class="secondary-btn" data-view="reports">View All Logs</button></div></section>`;
}

function renderVisitorPanel() {
  return `<section class="panel"><div class="panel-head"><h2>Visitor Log (Today)</h2><button class="ghost-btn" data-view="visitors">View all</button></div><div class="panel-body">${renderVisitorTable(true)}<button class="secondary-btn" data-view="visitors">${icons.visitor} Log Visitor</button></div></section>`;
}

function renderAgePanel() {
  return `<section class="panel"><div class="panel-head"><h2>Age Check / Refusal</h2><button class="ghost-btn" data-view="age">View all</button></div><div class="panel-body">${renderAgeSummary()}${renderAgeTable(true)}<button class="secondary-btn" data-view="age">${icons.visitor} Log Age Check</button></div></section>`;
}

function renderPostPanel() {
  if (!currentUser().postOffice) return `<section class="panel"><div class="panel-head"><h2>Post Office Duties</h2></div><div class="panel-body"><div class="empty">This staff member is not assigned to Post Office duties.</div></div></section>`;
  return `<section class="panel"><div class="panel-head"><h2>Post Office Duties</h2><button class="ghost-btn" data-view="post">View all</button></div><div class="duty-list">${state.records.postOfficeLogs.map((log) => `<div class="duty-row task-row"><button class="check ${log.status === "Completed" ? "done" : ""}" data-post-duty="${log.duty}">${log.status === "Completed" ? "✓" : ""}</button><span>${log.duty}</span><span class="status ${log.status === "Completed" ? "ok" : "warn"}">${log.time}</span></div>`).join("")}</div></section>`;
}

function renderActivityPanel() {
  const records = state.records;
  const activities = [
    ...records.temperatures.map((item) => ({ icon: icons.temp, title: "Temperature Check", sub: `${item.location}: ${item.temp} deg C`, time: item.time, tone: "ok" })),
    ...records.visitors.map((item) => ({ icon: icons.visitor, title: "Visitor Logged", sub: item.name, time: item.time, tone: "blue" })),
    ...records.ageChecks.map((item) => ({ icon: icons.age, title: item.outcome === "Refused" ? "Age Check Refused" : "Age Check", sub: item.outcome === "Refused" ? item.notes : "Sale Approved", time: item.time, tone: item.outcome === "Refused" ? "danger" : "warn" })),
    ...records.postOfficeLogs.filter((item) => item.status === "Completed").map((item) => ({ icon: icons.post, title: "Post Office Duty", sub: item.duty, time: item.time, tone: "blue" })),
    ...records.tasks.filter((task) => task.overdue && !task.done).map((task) => ({ icon: "!", title: "Task Overdue", sub: task.title, time: task.due, tone: "warn" })),
  ].sort((a, b) => a.time.localeCompare(b.time)).slice(-10);
  return `<aside class="panel activity-panel"><div class="panel-head"><h2>Recent Activity</h2><button class="ghost-btn" data-view="reports">View all</button></div><div class="activity-list">${activities.map((item) => `<div class="activity-row"><span class="${item.tone}">${item.icon}</span><div><strong>${item.title}</strong><small>${item.sub}<br>${currentUser().name}</small></div><small>${item.time}</small></div>`).join("")}</div></aside>`;
}

function renderTaskPage() {
  return `<h1 class="tab-title">Today's Tasks</h1>${renderTasksPanel(state.records.tasks.length)}`;
}

function renderLogPage(title, form, table) {
  return `<h1 class="tab-title">${title}</h1><div class="log-page"><section class="panel"><div class="panel-head"><h2>New Entry</h2></div><div class="panel-body">${form}</div></section><section class="panel records"><div class="panel-head"><h2>Today</h2></div><div class="panel-body">${table}</div></section></div>`;
}

function renderTemperatureForm() {
  return `<form data-form="temperature"><div class="field"><label>Location</label><select class="select" name="location">${temperatureLocations.map((item) => `<option>${item}</option>`).join("")}</select></div><div class="field"><label>Temperature (deg C)</label><input class="input" name="temp" value="3.2" inputmode="decimal"></div><div class="field"><label>Status</label><select class="select" name="status"><option>In Range</option><option>Out of Range - Action Taken</option></select></div><div class="field"><label>Notes (optional)</label><textarea class="textarea" name="notes" placeholder="Enter notes"></textarea></div><div class="form-actions"><button class="secondary-btn" type="reset">Clear</button><button class="primary-btn" type="submit">Save Log</button></div></form>`;
}

function renderVisitorForm() {
  return `<form data-form="visitor"><div class="field"><label>Name / Company</label><select class="select" name="name">${catalog.suppliers.map((supplier) => `<option>${supplier}</option>`).join("")}<option>Other Visitor</option></select></div><div class="field"><label>Purpose</label><select class="select" name="purpose"><option>Stock Delivery</option><option>Routine Maintenance</option><option>Sales Visit</option><option>Post Office Support</option><option>Other</option></select></div><div class="field"><label>Notes</label><textarea class="textarea" name="notes" placeholder="Optional"></textarea></div><div class="form-actions"><button class="secondary-btn" type="reset">Clear</button><button class="primary-btn" type="submit">Log Visitor</button></div></form>`;
}

function renderAgeForm() {
  return `<form data-form="age"><div class="field"><label>Outcome</label><select class="select" name="outcome"><option>Approved</option><option>Refused</option></select></div><div class="field"><label>Product Category</label><select class="select" name="category"><option>Vape</option><option>Tobacco</option><option>Alcohol</option><option>Lottery</option><option>Other Age Restricted Item</option></select></div><div class="field"><label>Notes</label><textarea class="textarea" name="notes" placeholder="ID checked, under 18, no ID, proxy sale concern"></textarea></div><div class="form-actions"><button class="secondary-btn" type="reset">Clear</button><button class="primary-btn" type="submit">Save Age Log</button></div></form>`;
}

function renderPostForm() {
  return `<form data-form="post"><div class="field"><label>Duty</label><select class="select" name="duty"><option>Open Procedure</option><option>Mail Bag Received</option><option>Midday Check</option><option>Mail Bag Dispatch</option><option>Close Down</option><option>Cash Balancing</option></select></div><div class="field"><label>Status</label><select class="select" name="status"><option>Completed</option><option>Issue Found</option></select></div><div class="field"><label>Notes</label><textarea class="textarea" name="notes" placeholder="Optional"></textarea></div><div class="form-actions"><button class="secondary-btn" type="reset">Clear</button><button class="primary-btn" type="submit">Log Duty</button></div></form>`;
}

function renderTemperatureTable() {
  return `<table class="table"><thead><tr><th>Time</th><th>Location</th><th>Temp</th><th>Status</th><th>Logged By</th></tr></thead><tbody>${state.records.temperatures.map((row) => `<tr><td>${row.time}</td><td>${row.location}</td><td>${row.temp} deg C</td><td class="ok">${row.status}</td><td>${row.staff}</td></tr>`).join("")}</tbody></table>`;
}

function renderVisitorTable(compact = false) {
  const rows = compact ? state.records.visitors.slice(0, 4) : state.records.visitors;
  return `<table class="table"><thead><tr><th>Time</th><th>Name / Company</th><th>Purpose</th>${compact ? "" : "<th>Logged By</th>"}</tr></thead><tbody>${rows.map((row) => `<tr><td>${row.time}</td><td>${row.name}</td><td>${row.purpose}</td>${compact ? "" : `<td>${row.staff}</td>`}</tr>`).join("")}</tbody></table>`;
}

function renderAgeSummary() {
  const approved = state.records.ageChecks.filter((item) => item.outcome === "Approved").length;
  const refused = state.records.ageChecks.filter((item) => item.outcome === "Refused").length;
  return `<div class="summary-pair"><div class="summary-box ok"><strong>${approved}</strong>Approved</div><div class="summary-box danger"><strong>${refused}</strong>Refused</div></div>`;
}

function renderAgeTable(compact = false) {
  const rows = compact ? state.records.ageChecks.slice(0, 4) : state.records.ageChecks;
  return `${compact ? "" : renderAgeSummary()}<table class="table"><thead><tr><th>Time</th><th>Outcome</th><th>Notes</th><th>Logged By</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${row.time}</td><td class="${row.outcome === "Refused" ? "danger" : "ok"}">${row.outcome}</td><td>${row.notes}</td><td>${row.staff}</td></tr>`).join("")}</tbody></table>`;
}

function renderPostTable() {
  return `<table class="table"><thead><tr><th>Time</th><th>Duty</th><th>Status</th><th>Logged By</th></tr></thead><tbody>${state.records.postOfficeLogs.map((row) => `<tr><td>${row.time}</td><td>${row.duty}</td><td class="${row.status === "Completed" ? "ok" : "warn"}">${row.status}</td><td>${row.staff || "-"}</td></tr>`).join("")}</tbody></table>`;
}

function renderReports() {
  return `<h1 class="tab-title">Logs & Reports</h1><div class="grid"><section class="panel"><div class="panel-head"><h2>Temperature</h2></div><div class="panel-body">${renderTemperatureTable()}</div></section><section class="panel"><div class="panel-head"><h2>Visitors</h2></div><div class="panel-body">${renderVisitorTable()}</div></section><section class="panel"><div class="panel-head"><h2>Age Checks</h2></div><div class="panel-body">${renderAgeTable()}</div></section></div>`;
}

function renderTeam() {
  const rows = catalog.staff.map((person) => `<tr><td>${person.name}</td><td>${person.role}</td><td>${catalog.stores.find((store) => store.id === person.storeId)?.name}</td><td>${person.postOffice ? "Yes" : "No"}</td></tr>`).join("");
  return `<h1 class="tab-title">Team</h1><section class="panel"><div class="panel-head"><h2>Staff Access</h2></div><div class="panel-body"><table class="table"><thead><tr><th>Name</th><th>Role</th><th>Home Store</th><th>Post Office</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

function bindApp() {
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => { state.activeView = button.dataset.view; render(); }));
  document.querySelectorAll("[data-store]").forEach((button) => button.addEventListener("click", async () => {
    try {
      applyPayload(await api("/api/switch-store", { method: "POST", body: JSON.stringify({ storeId: button.dataset.store }) }));
      showToast(`Switched to ${currentStore().name}`);
    } catch (error) {
      alert(error.message);
      render();
    }
  }));
  document.querySelectorAll("[data-task]").forEach((button) => button.addEventListener("click", async () => {
    applyPayload(await api(`/api/tasks/${encodeURIComponent(button.dataset.task)}`, { method: "POST" }));
    showToast("Task updated");
  }));
  document.querySelectorAll("[data-post-duty]").forEach((button) => button.addEventListener("click", async () => {
    applyPayload(await api(`/api/post-duty/${encodeURIComponent(button.dataset.postDuty)}`, { method: "POST" }));
    showToast("Post Office duty updated");
  }));
  document.querySelectorAll("form[data-form]").forEach((form) => form.addEventListener("submit", handleForm));
  document.querySelectorAll("[data-action='logout']").forEach((button) => button.addEventListener("click", async () => {
    await api("/api/logout", { method: "POST" }).catch(() => {});
    state.token = "";
    state.currentUser = null;
    state.records = null;
    localStorage.removeItem("retailOpsToken");
    render();
  }));
  document.querySelectorAll("[data-action='break']").forEach((button) => button.addEventListener("click", () => showToast("Break started")));
}

async function handleForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    applyPayload(await api(`/api/logs/${form.dataset.form}`, { method: "POST", body: JSON.stringify(data) }));
    form.reset();
    showToast("Log saved");
  } catch (error) {
    alert(error.message);
  }
}

function showToast(message) {
  state.toast = message;
  render();
  window.clearTimeout(window.toastTimer);
  window.toastTimer = window.setTimeout(() => {
    state.toast = "";
    render();
  }, 2200);
}

init();

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
  money: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 10v4M18 10v4"/></svg>',
  delivery: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h11v10H3z"/><path d="M14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
  audit: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l2 2 4-4"/><path d="M12 3l7 4v5c0 5-3 8-7 9-4-1-7-4-7-9V7z"/></svg>',
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
  temperatureDate: new Date().toISOString().slice(0, 10),
  reportMonth: new Date().toISOString().slice(0, 7),
  historyMode: "all",
  historyDate: new Date().toISOString().slice(0, 10),
  historyMonth: new Date().toISOString().slice(0, 7),
  temperatureReviewMode: "all",
  temperatureReviewDate: new Date().toISOString().slice(0, 10),
  temperatureReviewMonth: new Date().toISOString().slice(0, 7),
};

function currentStore() {
  return catalog.stores.find((store) => store.id === state.currentStoreId) || catalog.stores[0] || { name: "" };
}

function currentUser() {
  return state.currentUser || catalog.staff[0] || { name: "", role: "", initials: "", postOffice: false };
}

const logCollections = ["temperatures", "visitors", "ageChecks", "postOfficeLogs", "payouts", "deliveries", "auditTrail"];

function recordsBackupKey(storeId = state.currentStoreId) {
  return `retailOpsRecordsBackup:${storeId || "store"}`;
}

function rowKey(row, collection) {
  if (row.id) return `${collection}:id:${row.id}`;
  return [
    collection,
    row.entryType || "",
    row.date || "",
    row.month || "",
    row.time || "",
    row.unit || row.location || "",
    row.name || row.supplier || row.duty || row.paidTo || "",
    row.outcome || row.status || "",
    row.temp || row.amount || "",
    row.staff || "",
  ].join("|");
}

function readRecordsBackup(storeId = state.currentStoreId) {
  try {
    return JSON.parse(localStorage.getItem(recordsBackupKey(storeId)) || "{}");
  } catch {
    return {};
  }
}

function writeRecordsBackup(records, storeId = state.currentStoreId) {
  if (!records || !storeId) return;
  const existing = readRecordsBackup(storeId);
  const backup = { ...existing };
  logCollections.forEach((collection) => {
    const merged = new Map();
    [...(existing[collection] || []), ...(records[collection] || [])].forEach((row) => merged.set(rowKey(row, collection), row));
    backup[collection] = [...merged.values()];
  });
  localStorage.setItem(recordsBackupKey(storeId), JSON.stringify(backup));
}

function mergeRecordsBackup(records, storeId = state.currentStoreId) {
  if (!records || !storeId) return records;
  const backup = readRecordsBackup(storeId);
  const mergedRecords = { ...records };
  logCollections.forEach((collection) => {
    const merged = new Map();
    [...(records[collection] || []), ...(backup[collection] || [])].forEach((row) => merged.set(rowKey(row, collection), row));
    mergedRecords[collection] = [...merged.values()];
  });
  return mergedRecords;
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
    applyPayload(await api("/api/bootstrap"));
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
  if (payload.stores) catalog.stores = payload.stores;
  if (payload.staff) catalog.staff = payload.staff;
  if (payload.suppliers) catalog.suppliers = payload.suppliers;
  state.currentUser = payload.user || state.currentUser;
  state.currentStoreId = payload.storeId || state.currentStoreId;
  if (payload.records) {
    state.records = mergeRecordsBackup(payload.records, state.currentStoreId);
    writeRecordsBackup(state.records, state.currentStoreId);
  }
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

function draftKey(formName) {
  return `retailOpsDraft:${state.currentStoreId || "store"}:${currentUser().id || currentUser().name || "staff"}:${formName}`;
}

function readDraft(formName) {
  try {
    return JSON.parse(localStorage.getItem(draftKey(formName)) || "{}");
  } catch {
    return {};
  }
}

function writeDraft(form) {
  if (!form?.dataset?.form && form?.id !== "dailyTempForm") return;
  const formName = form.dataset.form || form.id;
  const data = {};
  if (form.id === "dailyTempForm") {
    data.date = document.getElementById("temperatureDate")?.value || state.temperatureDate;
    data.editReason = document.getElementById("dailyEditReason")?.value || "";
    data.entries = [...form.querySelectorAll("tbody tr")].map((row) => ({
      unit: row.querySelector("[name='unit']")?.value || "",
      temp: row.querySelector("[name='temp']")?.value || "",
      status: row.querySelector("[name='status']")?.value || "In Range",
      notes: row.querySelector("[name='notes']")?.value || "",
    }));
  } else {
    form.querySelectorAll("input, textarea, select").forEach((field) => {
      if (!field.name) return;
      if (field.type === "file") data[`${field.name}Name`] = field.files?.[0]?.name || "";
      else data[field.name] = field.value;
    });
  }
  localStorage.setItem(draftKey(formName), JSON.stringify(data));
}

function restoreDraft(form) {
  const formName = form.dataset.form || form.id;
  const data = readDraft(formName);
  if (form.id === "dailyTempForm") {
    if (data.editReason) {
      const reason = document.getElementById("dailyEditReason");
      if (reason) reason.value = data.editReason;
    }
    (data.entries || []).forEach((entry) => {
      const row = [...form.querySelectorAll("tbody tr")].find((item) => item.querySelector("[name='unit']")?.value === entry.unit);
      if (!row) return;
      row.querySelector("[name='temp']").value = entry.temp || "";
      row.querySelector("[name='status']").value = entry.status || "In Range";
      row.querySelector("[name='notes']").value = entry.notes || "";
    });
    return;
  }
  form.querySelectorAll("input, textarea, select").forEach((field) => {
    if (!field.name || field.type === "file") return;
    if (Object.prototype.hasOwnProperty.call(data, field.name)) field.value = data[field.name];
  });
}

function clearDraft(formName) {
  localStorage.removeItem(draftKey(formName));
}

function saveVisibleDrafts() {
  document.querySelectorAll("form[data-form], #dailyTempForm").forEach(writeDraft);
}

function bindDraftPersistence(form) {
  restoreDraft(form);
  form.addEventListener("input", () => writeDraft(form));
  form.addEventListener("change", () => writeDraft(form));
}

function renderLogin() {
  const storeOptions = catalog.stores.map((store) => `<option value="${store.id}">${store.name}</option>`).join("");
  return `
    <main class="login-wrap">
      <section class="login-panel">
        <div class="brand"><span class="brand-mark">${icons.store}</span><span>Retail Ops</span></div>
        <h1>Staff login</h1>
        <p>Enter your own name and password so every log shows exactly who made it.</p>
        <form id="loginForm">
          <div class="field"><label for="staffName">Staff name</label><input class="input" id="staffName" autocomplete="username" placeholder="Example: Arti" required autofocus></div>
          <div class="field"><label for="staffPassword">Password</label><input class="input" id="staffPassword" type="password" autocomplete="current-password" placeholder="Your staff password" required></div>
          <div class="field"><label for="storeSelect">Store</label><select class="select" id="storeSelect">${storeOptions}</select></div>
          <button class="primary-btn" type="submit">${icons.home} Login</button>
        </form>
        <div class="login-note">Starter password format: staff name plus 2505, for example denis2505.</div>
      </section>
      <section class="login-visual" aria-hidden="true">
        <div class="preview-board">
          <div class="preview-row">
            <div class="preview-card">Daily Temps<strong>24</strong><small class="muted">Units on one page</small></div>
            <div class="preview-card">Reports<strong>PDF</strong><small class="muted">Monthly download</small></div>
            <div class="preview-card">Logbook<strong>Audit</strong><small class="muted">Edits tracked</small></div>
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
          storeId: document.getElementById("storeSelect").value,
          staffName: document.getElementById("staffName").value,
          password: document.getElementById("staffPassword").value,
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
    ["temperature", "Daily Temps", icons.temp],
    ["visitors", "Visitor Log", icons.visitor],
    ["age", "Age Check Log", icons.age],
    ...(user.postOffice ? [["post", "Post Office Duties", icons.post]] : []),
    ["payouts", "Payouts", icons.money],
    ["deliveries", "Deliveries", icons.delivery],
    ["audit", "Logbook", icons.audit],
    ["reports", "History", icons.reports],
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
  if (state.activeView === "temperature") return renderDailyTemperaturePage();
  if (state.activeView === "visitors") return renderLogPage("Visitor Log", renderVisitorForm(), renderVisitorTable());
  if (state.activeView === "age") return renderLogPage("Age Check Log", renderAgeForm(), renderAgeTable());
  if (state.activeView === "post") return renderLogPage("Post Office Duties", renderPostForm(), renderPostTable());
  if (state.activeView === "payouts") return renderLogPage("Payouts", renderPayoutForm(), renderPayoutTable());
  if (state.activeView === "deliveries") return renderLogPage("Deliveries", renderDeliveryForm(), renderDeliveryTable());
  if (state.activeView === "audit") return renderAuditPage();
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
    ["Temperature", todaysTemperatureRows().length, "Logged today", icons.temp, "var(--green)", Math.min(100, (todaysTemperatureRows().length / temperatureLocations.length) * 100)],
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
  return `<section class="panel"><div class="panel-head"><h2>Daily Temperature Log</h2><button class="ghost-btn" data-view="temperature">Open</button></div><div class="panel-body"><div class="summary-pair"><div class="summary-box ok"><strong>${todaysTemperatureRows().length}</strong>Done today</div><div class="summary-box"><strong>${temperatureLocations.length}</strong>Total units</div></div><button class="primary-btn" data-view="temperature">${icons.temp} Enter all temperatures</button></div></section>`;
}

function renderQuickLogPanel() {
  const buttons = [["temperature", "Daily Temperatures", icons.temp], ["payouts", "Record Payout", icons.money], ["deliveries", "Record Delivery", icons.delivery], ["visitors", "Log Visitor", icons.visitor], ["age", "Log Age Check / Refusal", icons.age], ...(currentUser().postOffice ? [["post", "Post Office Duty", icons.post]] : [])];
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
    ...(records.payouts || []).map((item) => ({ icon: icons.money, title: "Payout", sub: `${item.amount} ${item.paidTo || ""}`, time: item.time, tone: "warn" })),
    ...(records.deliveries || []).map((item) => ({ icon: icons.delivery, title: "Delivery", sub: item.supplier || item.reference || "Delivery", time: item.time, tone: "blue" })),
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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonthsIso(months) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 7);
}

function todaysTemperatureRows() {
  return (state.records?.temperatures || []).filter((row) => row.date === todayIso());
}

function rowsForTemperatureDate() {
  const selectedDate = state.temperatureDate || todayIso();
  return (state.records?.temperatures || []).filter((row) => row.date === selectedDate);
}

function findTemperatureEntry(unit) {
  return rowsForTemperatureDate().find((row) => (row.unit || row.location) === unit) || {};
}

function displayDateParts(row) {
  return {
    date: row.date || "-",
    month: row.month || (row.date ? row.date.slice(0, 7) : "-"),
    time: row.time || "-",
    staff: row.staff || "-",
    type: row.entryType || "-",
  };
}

function rowDate(row) {
  return row.date || String(row.timestamp || row.createdAt || "").slice(0, 10);
}

function rowMonth(row) {
  return row.month || (rowDate(row) ? rowDate(row).slice(0, 7) : "");
}

function historyRows(rows = []) {
  const filtered = rows.filter((row) => {
    if (state.historyMode === "all") return true;
    if (state.historyMode === "month") return rowMonth(row) === state.historyMonth;
    return rowDate(row) === state.historyDate;
  });
  return filtered.sort((a, b) => `${rowDate(b)} ${b.time || ""}`.localeCompare(`${rowDate(a)} ${a.time || ""}`));
}

function historyTitle() {
  if (state.historyMode === "all") return "All saved records";
  if (state.historyMode === "month") return `Records for ${state.historyMonth}`;
  return `Records for ${state.historyDate}`;
}

function historyControls() {
  return `
    <section class="panel history-controls">
      <div class="panel-head">
        <h2>Previous Records</h2>
        <div class="table-tools">
          <button class="secondary-btn compact-btn ${state.historyMode === "date" && state.historyDate === todayIso() ? "active-filter" : ""}" data-history-date="${todayIso()}">Today</button>
          <button class="secondary-btn compact-btn ${state.historyMode === "date" && state.historyDate === addDaysIso(-1) ? "active-filter" : ""}" data-history-date="${addDaysIso(-1)}">Yesterday</button>
          <button class="secondary-btn compact-btn ${state.historyMode === "month" && state.historyMonth === todayIso().slice(0, 7) ? "active-filter" : ""}" data-history-month="${todayIso().slice(0, 7)}">This Month</button>
          <button class="secondary-btn compact-btn ${state.historyMode === "month" && state.historyMonth === addMonthsIso(-1) ? "active-filter" : ""}" data-history-month="${addMonthsIso(-1)}">Last Month</button>
          <button class="secondary-btn compact-btn ${state.historyMode === "all" ? "active-filter" : ""}" data-history-all>All</button>
        </div>
      </div>
      <div class="panel-body history-filter-row">
        <label class="inline-field">Choose date <input class="input compact-input" id="historyDate" type="date" value="${state.historyDate}"></label>
        <label class="inline-field">Choose month <input class="input compact-input" id="historyMonth" type="month" value="${state.historyMonth}"></label>
        <strong>${historyTitle()}</strong>
      </div>
    </section>`;
}

function temperatureReviewRows() {
  const rows = state.records.temperatures || [];
  const filtered = rows.filter((row) => {
    if (state.temperatureReviewMode === "all") return true;
    if (state.temperatureReviewMode === "month") return rowMonth(row) === state.temperatureReviewMonth;
    return rowDate(row) === state.temperatureReviewDate;
  });
  return filtered.sort((a, b) => `${rowDate(b)} ${b.time || ""}`.localeCompare(`${rowDate(a)} ${a.time || ""}`));
}

function temperatureReviewTitle() {
  if (state.temperatureReviewMode === "all") return "All temperature checks";
  if (state.temperatureReviewMode === "month") return `Temperature checks for ${state.temperatureReviewMonth}`;
  return `Temperature checks for ${state.temperatureReviewDate}`;
}

function temperatureReviewControls() {
  return `
    <div class="table-tools">
      <button class="secondary-btn compact-btn ${state.temperatureReviewMode === "date" && state.temperatureReviewDate === todayIso() ? "active-filter" : ""}" data-temp-review-date="${todayIso()}">Today</button>
      <button class="secondary-btn compact-btn ${state.temperatureReviewMode === "date" && state.temperatureReviewDate === addDaysIso(-1) ? "active-filter" : ""}" data-temp-review-date="${addDaysIso(-1)}">Yesterday</button>
      <button class="secondary-btn compact-btn ${state.temperatureReviewMode === "month" && state.temperatureReviewMonth === todayIso().slice(0, 7) ? "active-filter" : ""}" data-temp-review-month="${todayIso().slice(0, 7)}">This Month</button>
      <button class="secondary-btn compact-btn ${state.temperatureReviewMode === "month" && state.temperatureReviewMonth === addMonthsIso(-1) ? "active-filter" : ""}" data-temp-review-month="${addMonthsIso(-1)}">Last Month</button>
      <button class="secondary-btn compact-btn ${state.temperatureReviewMode === "all" ? "active-filter" : ""}" data-temp-review-all>All</button>
    </div>`;
}

function renderDailyTemperaturePage() {
  const selectedDate = state.temperatureDate || todayIso();
  const selectedMonth = selectedDate.slice(0, 7);
  return `
    <h1 class="tab-title">Daily Temperature Log</h1>
    <section class="panel">
      <div class="panel-head">
        <h2>${selectedDate}</h2>
        <div class="table-tools">
          <label class="inline-field">Date <input class="input compact-input" id="temperatureDate" type="date" value="${selectedDate}"></label>
          <label class="inline-field">PDF month <input class="input compact-input" id="temperatureReportMonth" type="month" value="${state.reportMonth || selectedMonth}"></label>
          <button class="secondary-btn" id="downloadTempPdf" type="button">${icons.reports} Download PDF</button>
        </div>
      </div>
      <div class="panel-body">
        <form id="dailyTempForm">
          <div class="daily-temp-wrap">
            <table class="table daily-temp-table">
              <thead><tr><th>Chiller / Freezer</th><th>Temperature</th><th>Status</th><th>Notes</th><th>Last saved</th></tr></thead>
              <tbody>
                ${temperatureLocations.map((unit) => {
                  const entry = findTemperatureEntry(unit);
                  const saved = displayDateParts(entry);
                  return `<tr>
                    <td><strong>${unit}</strong><input type="hidden" name="unit" value="${unit}"></td>
                    <td><input class="input temp-input" name="temp" inputmode="decimal" value="${entry.temp ?? ""}" placeholder="-18 or 3"></td>
                    <td><select class="select" name="status"><option ${entry.status === "In Range" ? "selected" : ""}>In Range</option><option ${entry.status === "Out of Range - Action Taken" ? "selected" : ""}>Out of Range - Action Taken</option></select></td>
                    <td><input class="input" name="notes" value="${entry.notes || ""}" placeholder="Optional note"></td>
                    <td><small>${saved.date}<br>${saved.month} ${saved.time}<br>${saved.staff}</small></td>
                  </tr>`;
                }).join("")}
              </tbody>
            </table>
          </div>
          <div class="field edit-reason">
            <label>Reason if correcting or changing entries</label>
            <textarea class="textarea" id="dailyEditReason" placeholder="Example: Temperature corrected after recheck"></textarea>
          </div>
          <div class="form-actions"><button class="primary-btn" type="submit">${icons.temp} Save daily temperatures</button></div>
        </form>
      </div>
    </section>
    <section class="panel records">
      <div class="panel-head"><h2>Saved entries for ${selectedDate}</h2></div>
      <div class="panel-body">${renderTemperatureTable(rowsForTemperatureDate())}</div>
    </section>
    <section class="panel records">
      <div class="panel-head">
        <h2>Previous Temperature Checks</h2>
        ${temperatureReviewControls()}
      </div>
      <div class="panel-body history-filter-row">
        <label class="inline-field">Choose date <input class="input compact-input" id="temperatureReviewDate" type="date" value="${state.temperatureReviewDate}"></label>
        <label class="inline-field">Choose month <input class="input compact-input" id="temperatureReviewMonth" type="month" value="${state.temperatureReviewMonth}"></label>
        <strong>${temperatureReviewTitle()}</strong>
      </div>
      <div class="panel-body">${renderTemperatureTable(temperatureReviewRows())}</div>
    </section>`;
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

function renderTemperatureTable(rows = state.records.temperatures) {
  if (!rows.length) return `<div class="empty">No temperature checks found for this date or month.</div>`;
  return `<table class="table"><thead><tr><th>Date</th><th>Month</th><th>Time</th><th>Unit</th><th>Temp</th><th>Status</th><th>Staff</th><th>Notes</th></tr></thead><tbody>${rows.map((row) => {
    const saved = displayDateParts(row);
    return `<tr><td>${saved.date}</td><td>${saved.month}</td><td>${saved.time}</td><td>${row.unit || row.location}</td><td>${row.temp} deg C</td><td class="${row.status === "In Range" ? "ok" : "warn"}">${row.status}</td><td>${saved.staff}</td><td>${row.notes || ""}</td></tr>`;
  }).join("")}</tbody></table>`;
}

function renderVisitorTable(compact = false, rowsOverride = null) {
  const sourceRows = rowsOverride || state.records.visitors;
  const rows = compact ? sourceRows.slice(0, 4) : sourceRows;
  return `<table class="table"><thead><tr><th>Date</th><th>Month</th><th>Time</th><th>Name / Company</th><th>Purpose</th>${compact ? "" : "<th>Staff</th>"}</tr></thead><tbody>${rows.map((row) => {
    const saved = displayDateParts(row);
    return `<tr><td>${saved.date}</td><td>${saved.month}</td><td>${saved.time}</td><td>${row.name}</td><td>${row.purpose}</td>${compact ? "" : `<td>${saved.staff}</td>`}</tr>`;
  }).join("")}</tbody></table>`;
}

function renderAgeSummary(rows = state.records.ageChecks) {
  const approved = rows.filter((item) => item.outcome === "Approved").length;
  const refused = rows.filter((item) => item.outcome === "Refused").length;
  return `<div class="summary-pair"><div class="summary-box ok"><strong>${approved}</strong>Approved</div><div class="summary-box danger"><strong>${refused}</strong>Refused</div></div>`;
}

function renderAgeTable(compact = false, rowsOverride = null) {
  const sourceRows = rowsOverride || state.records.ageChecks;
  const rows = compact ? sourceRows.slice(0, 4) : sourceRows;
  return `${compact ? "" : renderAgeSummary(rows)}<table class="table"><thead><tr><th>Date</th><th>Month</th><th>Time</th><th>Outcome</th><th>Category</th><th>Notes</th><th>Staff</th>${compact ? "" : "<th>Edit</th>"}</tr></thead><tbody>${rows.map((row) => {
    const saved = displayDateParts(row);
    return `<tr><td>${saved.date}</td><td>${saved.month}</td><td>${saved.time}</td><td class="${row.outcome === "Refused" ? "danger" : "ok"}">${row.outcome}</td><td>${row.category || ""}</td><td>${row.notes}</td><td>${saved.staff}</td>${compact ? "" : `<td>${row.id ? `<button class="secondary-btn compact-btn" type="button" data-edit-age="${row.id}">Edit</button>` : ""}</td>`}</tr>`;
  }).join("")}</tbody></table>`;
}

function renderPostTable(rows = state.records.postOfficeLogs) {
  return `<table class="table"><thead><tr><th>Date</th><th>Month</th><th>Time</th><th>Duty</th><th>Status</th><th>Staff</th></tr></thead><tbody>${rows.map((row) => {
    const saved = displayDateParts(row);
    return `<tr><td>${saved.date}</td><td>${saved.month}</td><td>${saved.time}</td><td>${row.duty}</td><td class="${row.status === "Completed" ? "ok" : "warn"}">${row.status}</td><td>${saved.staff}</td></tr>`;
  }).join("")}</tbody></table>`;
}

function renderPayoutForm() {
  return `<form data-form="payout"><div class="field"><label>Amount</label><input class="input" name="amount" inputmode="decimal" placeholder="25.00" required></div><div class="field"><label>Paid to</label><input class="input" name="paidTo" placeholder="Name or company" required></div><div class="field"><label>Reason</label><select class="select" name="reason"><option>Supplier payout</option><option>Staff expense</option><option>Refund</option><option>Post Office payout</option><option>Other</option></select></div><div class="field"><label>Notes</label><textarea class="textarea" name="notes" placeholder="Optional"></textarea></div><div class="form-actions"><button class="secondary-btn" type="reset">Clear</button><button class="primary-btn" type="submit">${icons.money} Save payout</button></div></form>`;
}

function renderPayoutTable(rows = state.records.payouts || []) {
  return `<table class="table"><thead><tr><th>Date</th><th>Month</th><th>Time</th><th>Amount</th><th>Paid to</th><th>Reason</th><th>Staff</th><th>Entry</th></tr></thead><tbody>${rows.map((row) => {
    const saved = displayDateParts(row);
    return `<tr><td>${saved.date}</td><td>${saved.month}</td><td>${saved.time}</td><td>${row.amount}</td><td>${row.paidTo}</td><td>${row.reason}</td><td>${saved.staff}</td><td>${saved.type}</td></tr>`;
  }).join("")}</tbody></table>`;
}

function renderDeliveryForm() {
  return `<form data-form="delivery"><div class="field"><label>Supplier</label><select class="select" name="supplier">${catalog.suppliers.map((supplier) => `<option>${supplier}</option>`).join("")}<option>Other Supplier</option></select></div><div class="field"><label>Reference / invoice number</label><input class="input" name="reference" placeholder="Invoice or delivery note number"></div><div class="field"><label>Delivery document/photo</label><input class="input" name="documentFile" type="file" accept="image/*,.pdf"></div><div class="field"><label>Document note</label><input class="input" name="documentNote" placeholder="Example: invoice photo uploaded"></div><div class="field"><label>Notes</label><textarea class="textarea" name="notes" placeholder="Optional"></textarea></div><div class="form-actions"><button class="secondary-btn" type="reset">Clear</button><button class="primary-btn" type="submit">${icons.delivery} Save delivery</button></div></form>`;
}

function renderDeliveryTable(rows = state.records.deliveries || []) {
  return `<table class="table"><thead><tr><th>Date</th><th>Month</th><th>Time</th><th>Supplier</th><th>Reference</th><th>Document</th><th>Staff</th><th>Entry</th></tr></thead><tbody>${rows.map((row) => {
    const saved = displayDateParts(row);
    return `<tr><td>${saved.date}</td><td>${saved.month}</td><td>${saved.time}</td><td>${row.supplier}</td><td>${row.reference || ""}</td><td>${row.documentName || row.documentNote || ""}</td><td>${saved.staff}</td><td>${saved.type}</td></tr>`;
  }).join("")}</tbody></table>`;
}

function renderAuditTable(rows = state.records.auditTrail || []) {
  return `<table class="table"><thead><tr><th>Date</th><th>Month</th><th>Time</th><th>Entry</th><th>Action</th><th>Edited by</th><th>Reason</th></tr></thead><tbody>${rows.map((row) => {
    const saved = displayDateParts(row);
    return `<tr><td>${saved.date}</td><td>${saved.month}</td><td>${saved.time}</td><td>${row.entryType}</td><td>${row.action}</td><td>${row.staff}</td><td>${row.reason}</td></tr>`;
  }).join("")}</tbody></table>`;
}

function renderAuditPage() {
  const rows = state.records.auditTrail || [];
  return `<h1 class="tab-title">Logbook</h1>${historyControls()}<section class="panel records"><div class="panel-head"><h2>Issues, corrections, and edits</h2></div><div class="panel-body">${renderAuditTable(historyRows(rows))}${rows.length ? "" : `<div class="empty">No edits or issues recorded yet.</div>`}</div></section>`;
}

function renderReports() {
  const temperatureRows = historyRows(state.records.temperatures || []);
  const visitorRows = historyRows(state.records.visitors || []);
  const ageRows = historyRows(state.records.ageChecks || []);
  const postRows = historyRows(state.records.postOfficeLogs || []);
  const payoutRows = historyRows(state.records.payouts || []);
  const deliveryRows = historyRows(state.records.deliveries || []);
  const auditRows = historyRows(state.records.auditTrail || []);
  const total = temperatureRows.length + visitorRows.length + ageRows.length + postRows.length + payoutRows.length + deliveryRows.length + auditRows.length;
  return `<h1 class="tab-title">History & Reports</h1>
    ${historyControls()}
    <div class="stats history-stats">
      <article class="stat"><div class="stat-top"><span class="stat-icon" style="background:var(--green)">${icons.temp}</span><div>Temperature<br><strong>${temperatureRows.length}</strong></div></div><span>${historyTitle()}</span></article>
      <article class="stat"><div class="stat-top"><span class="stat-icon" style="background:var(--blue)">${icons.visitor}</span><div>Visitors<br><strong>${visitorRows.length}</strong></div></div><span>${historyTitle()}</span></article>
      <article class="stat"><div class="stat-top"><span class="stat-icon" style="background:var(--amber)">${icons.reports}</span><div>All Records<br><strong>${total}</strong></div></div><span>Inspection view</span></article>
    </div>
    <div class="grid reports-grid">
      <section class="panel"><div class="panel-head"><h2>Temperature Logbook</h2><button class="ghost-btn" data-view="temperature">Daily entry</button></div><div class="panel-body">${renderTemperatureTable(temperatureRows)}</div></section>
      <section class="panel"><div class="panel-head"><h2>Visitor Logbook</h2></div><div class="panel-body">${renderVisitorTable(false, visitorRows)}</div></section>
      <section class="panel"><div class="panel-head"><h2>Age Check Logbook</h2></div><div class="panel-body">${renderAgeTable(false, ageRows)}</div></section>
      <section class="panel"><div class="panel-head"><h2>Post Office Duties</h2></div><div class="panel-body">${renderPostTable(postRows)}</div></section>
      <section class="panel"><div class="panel-head"><h2>Payouts</h2></div><div class="panel-body">${renderPayoutTable(payoutRows)}</div></section>
      <section class="panel"><div class="panel-head"><h2>Deliveries</h2></div><div class="panel-body">${renderDeliveryTable(deliveryRows)}</div></section>
      <section class="panel"><div class="panel-head"><h2>Edits / Audit Logbook</h2></div><div class="panel-body">${renderAuditTable(auditRows)}</div></section>
    </div>`;
}

function renderTeam() {
  const rows = catalog.staff.map((person) => `<tr><td>${person.name}</td><td>${person.role}</td><td>${catalog.stores.find((store) => store.id === person.storeId)?.name}</td><td>${person.postOffice ? "Yes" : "No"}</td></tr>`).join("");
  return `<h1 class="tab-title">Team</h1><section class="panel"><div class="panel-head"><h2>Staff Access</h2></div><div class="panel-body"><table class="table"><thead><tr><th>Name</th><th>Role</th><th>Home Store</th><th>Post Office</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

function bindApp() {
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
    saveVisibleDrafts();
    state.activeView = button.dataset.view;
    render();
  }));
  document.querySelectorAll("[data-store]").forEach((button) => button.addEventListener("click", async () => {
    try {
      saveVisibleDrafts();
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
  document.querySelectorAll("[data-edit-age]").forEach((button) => button.addEventListener("click", () => handleAgeEdit(button.dataset.editAge)));
  document.querySelectorAll("form[data-form]").forEach((form) => {
    bindDraftPersistence(form);
    form.addEventListener("submit", handleForm);
  });
  const dailyTempForm = document.getElementById("dailyTempForm");
  if (dailyTempForm) {
    bindDraftPersistence(dailyTempForm);
    dailyTempForm.addEventListener("submit", handleDailyTemperature);
  }
  const tempDate = document.getElementById("temperatureDate");
  if (tempDate) tempDate.addEventListener("change", () => {
    saveVisibleDrafts();
    state.temperatureDate = tempDate.value || todayIso();
    render();
  });
  const reportMonth = document.getElementById("temperatureReportMonth");
  if (reportMonth) reportMonth.addEventListener("change", () => {
    state.reportMonth = reportMonth.value || todayIso().slice(0, 7);
  });
  const downloadButton = document.getElementById("downloadTempPdf");
  if (downloadButton) downloadButton.addEventListener("click", downloadTemperaturePdf);
  document.querySelectorAll("[data-temp-review-date]").forEach((button) => button.addEventListener("click", () => {
    state.temperatureReviewMode = "date";
    state.temperatureReviewDate = button.dataset.tempReviewDate;
    render();
  }));
  document.querySelectorAll("[data-temp-review-month]").forEach((button) => button.addEventListener("click", () => {
    state.temperatureReviewMode = "month";
    state.temperatureReviewMonth = button.dataset.tempReviewMonth;
    render();
  }));
  document.querySelectorAll("[data-temp-review-all]").forEach((button) => button.addEventListener("click", () => {
    state.temperatureReviewMode = "all";
    render();
  }));
  const temperatureReviewDate = document.getElementById("temperatureReviewDate");
  if (temperatureReviewDate) temperatureReviewDate.addEventListener("change", () => {
    state.temperatureReviewMode = "date";
    state.temperatureReviewDate = temperatureReviewDate.value || todayIso();
    render();
  });
  const temperatureReviewMonth = document.getElementById("temperatureReviewMonth");
  if (temperatureReviewMonth) temperatureReviewMonth.addEventListener("change", () => {
    state.temperatureReviewMode = "month";
    state.temperatureReviewMonth = temperatureReviewMonth.value || todayIso().slice(0, 7);
    render();
  });
  document.querySelectorAll("[data-history-date]").forEach((button) => button.addEventListener("click", () => {
    state.historyMode = "date";
    state.historyDate = button.dataset.historyDate;
    render();
  }));
  document.querySelectorAll("[data-history-month]").forEach((button) => button.addEventListener("click", () => {
    state.historyMode = "month";
    state.historyMonth = button.dataset.historyMonth;
    render();
  }));
  document.querySelectorAll("[data-history-all]").forEach((button) => button.addEventListener("click", () => {
    state.historyMode = "all";
    render();
  }));
  const historyDate = document.getElementById("historyDate");
  if (historyDate) historyDate.addEventListener("change", () => {
    state.historyMode = "date";
    state.historyDate = historyDate.value || todayIso();
    render();
  });
  const historyMonth = document.getElementById("historyMonth");
  if (historyMonth) historyMonth.addEventListener("change", () => {
    state.historyMode = "month";
    state.historyMonth = historyMonth.value || todayIso().slice(0, 7);
    render();
  });
  document.querySelectorAll("[data-action='logout']").forEach((button) => button.addEventListener("click", async () => {
    await api("/api/logout", { method: "POST" }).catch(() => {});
    state.token = "";
    state.currentUser = null;
    state.records = null;
    localStorage.removeItem("retailOpsToken");
    render();
  }));
  document.querySelectorAll("[data-action='break']").forEach((button) => button.addEventListener("click", () => {
    saveVisibleDrafts();
    showToast("Break started");
  }));
}

async function handleForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  if (form.dataset.form === "delivery") {
    const fileInput = form.querySelector("input[type='file']");
    data.documentName = fileInput?.files?.[0]?.name || "";
    delete data.documentFile;
  }
  try {
    applyPayload(await api(`/api/logs/${form.dataset.form}`, { method: "POST", body: JSON.stringify(data) }));
    clearDraft(form.dataset.form);
    form.reset();
    showToast("Log saved");
  } catch (error) {
    alert(error.message);
  }
}

async function handleAgeEdit(entryId) {
  const entry = (state.records.ageChecks || []).find((row) => row.id === entryId);
  if (!entry) {
    alert("Age check entry not found");
    return;
  }
  const outcome = prompt("Outcome: Approved or Refused", entry.outcome || "Approved");
  if (outcome === null) return;
  const cleanOutcome = String(outcome).trim();
  if (!["Approved", "Refused"].includes(cleanOutcome)) {
    alert("Outcome must be Approved or Refused");
    return;
  }
  const category = prompt("Product category", entry.category || "");
  if (category === null) return;
  const notes = prompt("Notes", entry.notes || "");
  if (notes === null) return;
  const reason = prompt("Reason for edit (required)", "Corrected age check entry");
  if (!String(reason || "").trim()) {
    alert("Please enter a reason for the edit");
    return;
  }
  try {
    applyPayload(await api(`/api/logs/edit/${encodeURIComponent(entryId)}`, {
      method: "POST",
      body: JSON.stringify({
        editReason: reason,
        patch: {
          outcome: cleanOutcome,
          category: String(category).trim(),
          notes: String(notes).trim(),
        },
      }),
    }));
    showToast("Age check edited");
  } catch (error) {
    alert(error.message);
  }
}

async function handleDailyTemperature(event) {
  event.preventDefault();
  const rows = [...event.currentTarget.querySelectorAll("tbody tr")];
  const entries = rows.map((row) => ({
    unit: row.querySelector("[name='unit']").value,
    temp: row.querySelector("[name='temp']").value,
    status: row.querySelector("[name='status']").value,
    notes: row.querySelector("[name='notes']").value,
  })).filter((entry) => entry.temp !== "");
  try {
    applyPayload(await api("/api/temperature/daily", {
      method: "POST",
      body: JSON.stringify({
        date: state.temperatureDate || todayIso(),
        editReason: document.getElementById("dailyEditReason")?.value || "",
        entries,
      }),
    }));
    clearDraft("dailyTempForm");
    showToast("Daily temperatures saved");
  } catch (error) {
    alert(error.message);
  }
}

async function downloadTemperaturePdf() {
  const month = document.getElementById("temperatureReportMonth")?.value || state.reportMonth || todayIso().slice(0, 7);
  try {
    const response = await fetch(`/api/reports/temperature-pdf?month=${encodeURIComponent(month)}`, {
      headers: state.token ? { Authorization: `Bearer ${state.token}` } : {},
    });
    if (!response.ok) throw new Error("Could not download PDF");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `temperature-log-${month}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Temperature PDF downloaded");
  } catch (error) {
    alert(error.message);
  }
}

function showToast(message) {
  state.toast = message;
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  window.clearTimeout(window.toastTimer);
  window.toastTimer = window.setTimeout(() => {
    state.toast = "";
    toast.remove();
  }, 2200);
}

init();

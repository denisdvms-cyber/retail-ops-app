const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const port = Number(process.env.PORT || 5173);
const dataPath = path.join(root, "data.json");
const sessions = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const stores = [
  { id: "s1", name: "All in one convenience - L31 2HH" },
  { id: "s2", name: "SPAR WALLASEY / TRAFALGAL POST OFFICE" },
  { id: "s3", name: "GO LOCAL OLD SWAN" },
  { id: "s4", name: "LISCARD STOP & SHOP" },
];

const suppliers = [
  "JAMES HALL SPAR",
  "PARFETTS",
  "BOOKERS",
  "BESTWAY",
  "FOODART",
  "FRESHWAY",
  "DHAMACHA",
  "TAMIL SUPPLIER",
  "NORTHWEST WHOLESALER",
  "NESTLE",
  "CADBURY",
  "COCA COLA",
  "BOBBY",
  "VAPE-VSL",
  ...Array.from({ length: 30 }, (_, index) => `USER ${index + 1}`),
];

const staff = [
  staffMember("u1", "Arti", "Store Manager", "s1", true, "A"),
  staffMember("u2", "Siva", "Supervisor", "s1", true, "S"),
  staffMember("u3", "Sahana", "Sales Assistant", "s1", false, "SA"),
  staffMember("u4", "Sandhiya", "Sales Assistant", "s1", false, "SN"),
  staffMember("u5", "Abinath", "Sales Assistant", "s1", false, "AB"),
  staffMember("u6", "Divya", "Supervisor", "s2", true, "D"),
  staffMember("u7", "Puvan", "Sales Assistant", "s2", true, "P"),
  staffMember("u8", "Pasinthu", "Sales Assistant", "s2", false, "PA"),
  staffMember("u9", "Nisanthan", "Sales Assistant", "s2", false, "N"),
  staffMember("u10", "Deepanshu", "Sales Assistant", "s2", false, "DE"),
  staffMember("u11", "Vishnu", "Supervisor", "s3", true, "V"),
  staffMember("u12", "Vijekumar", "Sales Assistant", "s3", false, "VI"),
  staffMember("u13", "Keeran", "Sales Assistant", "s3", false, "K"),
  staffMember("u14", "Denis", "Store Manager", "s3", true, "D"),
  staffMember("u15", "Ananth", "Sales Assistant", "s3", false, "AN"),
  staffMember("u16", "Amen", "Supervisor", "s4", true, "AM"),
  staffMember("u17", "Partap", "Sales Assistant", "s4", false, "P"),
  staffMember("u18", "User 1", "Sales Assistant", "s4", false, "U1"),
  staffMember("u19", "User 2", "Sales Assistant", "s4", false, "U2"),
  staffMember("u20", "User 3", "Sales Assistant", "s4", false, "U3"),
  staffMember("u21", "User 4", "Sales Assistant", "s1", false, "U4"),
  staffMember("u22", "User 5", "Sales Assistant", "s2", false, "U5"),
];

const baseTasks = [
  { id: "open", title: "Store Opening Checklist", due: "07:05", done: true },
  { id: "fridge", title: "Temperature Check - Chillers", due: "07:15", done: true },
  { id: "freezer", title: "Temperature Check - Freezers", due: "07:16", done: true },
  { id: "fire", title: "Fire Exit & Safety Check", due: "09:30", done: false, overdue: true },
  { id: "till", title: "Till Float Check", due: "09:00", done: false },
  { id: "signage", title: "Age Restriction Signage Check", due: "08:00", done: true },
  { id: "shelves", title: "Shelves & Pricing Check", due: "10:00", done: false },
  { id: "visitor", title: "Visitor Log Review", due: "11:00", done: false },
  { id: "po-open", title: "Post Office - Open Procedure", due: "07:10", done: true, postOffice: true },
  { id: "po-mid", title: "Post Office - Midday Check", due: "12:00", done: false, postOffice: true },
  { id: "po-close", title: "Post Office - Close Down", due: "17:30", done: false, postOffice: true },
  { id: "close", title: "Store Close Down Checklist", due: "21:30", done: false },
];

function staffMember(id, name, role, storeId, postOffice, initials) {
  return { id, name, role, storeId, postOffice, initials, pinHash: hashPin("2505") };
}

function hashPin(pin) {
  return crypto.createHash("sha256").update(String(pin)).digest("hex");
}

function publicStaff(person) {
  const { pin, pinHash, ...safePerson } = person;
  return safePerson;
}

function seedStoreRecords(storeId) {
  return {
    storeId,
    tasks: baseTasks.map((task) => ({ ...task })),
    temperatures: [
      { time: "07:15", location: "Display Chiller 1", temp: "3.2", status: "In Range", staff: "Arti" },
      { time: "07:16", location: "Freezer 1", temp: "-18.4", status: "In Range", staff: "Arti" },
    ],
    visitors: [
      { time: "07:20", name: "JAMES HALL SPAR", purpose: "Stock Delivery", staff: "Arti" },
      { time: "09:05", name: "PARFETTS", purpose: "Stock Delivery", staff: "Arti" },
    ],
    ageChecks: [
      { time: "08:02", outcome: "Approved", notes: "Vape", staff: "Arti" },
      { time: "08:10", outcome: "Refused", notes: "No ID shown", staff: "Arti" },
    ],
    postOfficeLogs: [
      { time: "07:10", duty: "Open Procedure", status: "Completed", staff: "Arti" },
      { time: "07:45", duty: "Mail Bag Received", status: "Completed", staff: "Arti" },
      { time: "12:00", duty: "Midday Check", status: "Due", staff: "" },
      { time: "14:30", duty: "Mail Bag Dispatch", status: "Due", staff: "" },
      { time: "17:30", duty: "Close Down", status: "Due", staff: "" },
      { time: "17:45", duty: "Cash Balancing", status: "Due", staff: "" },
    ],
  };
}

function defaultData() {
  return {
    stores,
    staff,
    suppliers,
    records: Object.fromEntries(stores.map((store) => [store.id, seedStoreRecords(store.id)])),
  };
}

function readData() {
  if (!fs.existsSync(dataPath)) {
    const seed = defaultData();
    writeData(seed);
    return seed;
  }

  const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  let changed = false;
  data.staff = data.staff.map((person) => {
    if (person.pin) {
      changed = true;
      const { pin, ...rest } = person;
      return { ...rest, pinHash: person.pinHash || hashPin(pin) };
    }
    return person;
  });
  if (changed) writeData(data);
  return data;
}

function writeData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) request.destroy();
    });
    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function getSession(request) {
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token ? sessions.get(token) : null;
}

function currentTime() {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function storePayload(data, storeId) {
  return {
    storeId,
    records: data.records[storeId] || seedStoreRecords(storeId),
  };
}

async function handleApi(request, response, pathname) {
  const data = readData();

  if (request.method === "GET" && pathname === "/api/bootstrap") {
    sendJson(response, 200, {
      stores: data.stores,
      staff: data.staff.map(publicStaff),
      suppliers: data.suppliers,
    });
    return;
  }

  if (request.method === "POST" && pathname === "/api/login") {
    const body = await readBody(request);
    const user = data.staff.find((person) => person.id === body.staffId);
    const store = data.stores.find((item) => item.id === body.storeId);

    if (!user || !store || hashPin(body.pin) !== user.pinHash) {
      sendJson(response, 401, { message: "Wrong staff, store, or PIN" });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, { userId: user.id, storeId: store.id, createdAt: Date.now() });
    sendJson(response, 200, {
      token,
      user: publicStaff(user),
      ...storePayload(data, store.id),
    });
    return;
  }

  const session = getSession(request);
  if (!session) {
    sendJson(response, 401, { message: "Please log in again" });
    return;
  }

  const user = data.staff.find((person) => person.id === session.userId);
  const userStoreId = session.storeId;
  data.records[userStoreId] ||= seedStoreRecords(userStoreId);
  const records = data.records[userStoreId];

  if (request.method === "GET" && pathname === "/api/state") {
    sendJson(response, 200, {
      user: publicStaff(user),
      ...storePayload(data, userStoreId),
    });
    return;
  }

  if (request.method === "POST" && pathname === "/api/switch-store") {
    const body = await readBody(request);
    if (!data.stores.some((store) => store.id === body.storeId)) {
      sendJson(response, 400, { message: "Unknown store" });
      return;
    }
    session.storeId = body.storeId;
    data.records[body.storeId] ||= seedStoreRecords(body.storeId);
    writeData(data);
    sendJson(response, 200, storePayload(data, body.storeId));
    return;
  }

  if (request.method === "POST" && pathname === "/api/logout") {
    const header = request.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    sessions.delete(token);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && pathname.startsWith("/api/tasks/")) {
    const taskId = decodeURIComponent(pathname.replace("/api/tasks/", ""));
    const task = records.tasks.find((item) => item.id === taskId);
    if (!task) {
      sendJson(response, 404, { message: "Task not found" });
      return;
    }
    task.done = !task.done;
    if (task.done) task.overdue = false;
    writeData(data);
    sendJson(response, 200, storePayload(data, userStoreId));
    return;
  }

  if (request.method === "POST" && pathname.startsWith("/api/post-duty/")) {
    const duty = decodeURIComponent(pathname.replace("/api/post-duty/", ""));
    const row = records.postOfficeLogs.find((item) => item.duty === duty);
    if (!row) {
      sendJson(response, 404, { message: "Duty not found" });
      return;
    }
    row.status = row.status === "Completed" ? "Due" : "Completed";
    row.staff = row.status === "Completed" ? user.name : "";
    row.time = currentTime();
    writeData(data);
    sendJson(response, 200, storePayload(data, userStoreId));
    return;
  }

  if (request.method === "POST" && pathname.startsWith("/api/logs/")) {
    const type = pathname.replace("/api/logs/", "");
    const body = await readBody(request);
    const time = currentTime();

    if (type === "temperature") {
      records.temperatures.unshift({
        time,
        location: body.location,
        temp: body.temp,
        status: body.status,
        staff: user.name,
      });
    } else if (type === "visitor") {
      records.visitors.unshift({
        time,
        name: body.name || "Visitor",
        purpose: body.purpose,
        staff: user.name,
      });
    } else if (type === "age") {
      records.ageChecks.unshift({
        time,
        outcome: body.outcome,
        notes: body.notes || body.category,
        staff: user.name,
      });
    } else if (type === "post") {
      records.postOfficeLogs.unshift({
        time,
        duty: body.duty,
        status: body.status,
        staff: user.name,
      });
    } else {
      sendJson(response, 404, { message: "Unknown log type" });
      return;
    }

    writeData(data);
    sendJson(response, 200, storePayload(data, userStoreId));
    return;
  }

  sendJson(response, 404, { message: "Not found" });
}

function serveStatic(request, response, pathname) {
  const cleanUrl = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(root, cleanUrl));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "text/plain; charset=utf-8",
    });
    response.end(data);
  });
}

http
  .createServer((request, response) => {
    const { pathname } = new URL(request.url, `http://${request.headers.host}`);
    if (pathname.startsWith("/api/")) {
      handleApi(request, response, pathname).catch((error) => {
        sendJson(response, 500, { message: error.message || "Server error" });
      });
      return;
    }
    serveStatic(request, response, pathname);
  })
  .listen(port, "0.0.0.0", () => {
    console.log(`Retail Ops running at http://127.0.0.1:${port}`);
  });

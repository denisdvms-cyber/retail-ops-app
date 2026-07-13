const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const port = Number(process.env.PORT || 5173);
const dataPath = process.env.DATA_PATH || path.join(process.env.DATA_DIR || root, "data.json");
const sessions = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const platformEmailDomain = "elevateprosperltd.com";
const platformAdminEmail = `denis@${platformEmailDomain}`;
const platformEmailSetup = {
  provider: "Google Workspace Business Starter",
  domain: platformEmailDomain,
  adminEmail: platformAdminEmail,
  recommendedMailboxes: [
    { address: `support@${platformEmailDomain}`, purpose: "Customer support and help desk replies" },
    { address: `billing@${platformEmailDomain}`, purpose: "Subscriptions, invoices, refunds, and account credits" },
    { address: `security@${platformEmailDomain}`, purpose: "Login alerts, 2FA, abuse reports, and security notices" },
    { address: `noreply@${platformEmailDomain}`, purpose: "Email verification, password reset, and automated notifications" },
  ],
  oauthProvider: "Google OpenID Connect",
  status: "Ready to connect",
};

const stores = [
  {
    id: "s1",
    name: "All in one convenience - L31 2HH",
    country: "United Kingdom",
    region: "Merseyside",
    currency: "GBP",
    language: "English",
    timeZone: "Europe/London",
    taxName: "VAT",
    taxRate: 20,
    storeType: "Convenience Store",
    address: "L31 2HH",
    businessEmail: platformAdminEmail,
    mobile: "+44 7000 000001",
    vatGstNumber: "",
    companyRegistrationNumber: "",
    desiredMargin: 25,
  },
  {
    id: "s2",
    name: "SPAR WALLASEY / TRAFALGAL POST OFFICE",
    country: "United Kingdom",
    region: "Wirral",
    currency: "GBP",
    language: "English",
    timeZone: "Europe/London",
    taxName: "VAT",
    taxRate: 20,
    storeType: "Convenience Store + Post Office",
    address: "Wallasey",
    businessEmail: "wallasey@example.com",
    mobile: "+44 7000 000002",
    vatGstNumber: "",
    companyRegistrationNumber: "",
    desiredMargin: 25,
  },
  {
    id: "s3",
    name: "GO LOCAL OLD SWAN",
    country: "United Kingdom",
    region: "Liverpool",
    currency: "GBP",
    language: "English",
    timeZone: "Europe/London",
    taxName: "VAT",
    taxRate: 20,
    storeType: "Convenience Store",
    address: "Old Swan, Liverpool",
    businessEmail: "oldswan@example.com",
    mobile: "+44 7000 000003",
    vatGstNumber: "",
    companyRegistrationNumber: "",
    desiredMargin: 25,
  },
  {
    id: "s4",
    name: "LISCARD STOP & SHOP",
    country: "United Kingdom",
    region: "Wirral",
    currency: "GBP",
    language: "English",
    timeZone: "Europe/London",
    taxName: "VAT",
    taxRate: 20,
    storeType: "Convenience Store",
    address: "Liscard",
    businessEmail: "liscard@example.com",
    mobile: "+44 7000 000004",
    vatGstNumber: "",
    companyRegistrationNumber: "",
    desiredMargin: 25,
  },
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

const temperatureUnits = [
  ...Array.from({ length: 10 }, (_, index) => `Display Chiller ${index + 1}`),
  "Milk Chiller",
  "Drinks Chiller",
  "Sandwich Chiller",
  "Stock Room Chiller",
  ...Array.from({ length: 10 }, (_, index) => `Freezer ${index + 1}`),
  "Ice Cream Freezer",
  "Stock Room Freezer",
];

const productTemplates = [
  {
    supplier: "JAMES HALL SPAR",
    productName: "Coca-Cola Original Taste 24 x 330ml",
    barcode: "5449000000996",
    packSize: "24 x 330ml",
    quantity: 4,
    unitCost: 8.95,
    category: "Soft Drinks",
    rrp: 12.99,
    competitorPrice: 12.49,
    localPromoPrice: 11.99,
    promotionalText: "Local multibuy available",
  },
  {
    supplier: "JAMES HALL SPAR",
    productName: "Cadbury Dairy Milk 48 x 45g",
    barcode: "7622210987654",
    packSize: "48 x 45g",
    quantity: 2,
    unitCost: 22.5,
    category: "Confectionery",
    rrp: 34.99,
    competitorPrice: 33.99,
    localPromoPrice: 31.99,
    promotionalText: "Weekend chocolate offer",
  },
  {
    supplier: "PARFETTS",
    productName: "Walkers Ready Salted Crisps 32 x 32.5g",
    barcode: "5000328372147",
    packSize: "32 x 32.5g",
    quantity: 3,
    unitCost: 13.25,
    category: "Snacks",
    rrp: 19.99,
    competitorPrice: 18.99,
    localPromoPrice: 17.99,
    promotionalText: "Price-marked pack support",
  },
  {
    supplier: "BOOKERS",
    productName: "Volvic Mineral Water 12 x 1.5L",
    barcode: "3057640257773",
    packSize: "12 x 1.5L",
    quantity: 5,
    unitCost: 5.8,
    category: "Water",
    rrp: 8.99,
    competitorPrice: 8.49,
    localPromoPrice: 7.99,
    promotionalText: "Summer hydration deal",
  },
  {
    supplier: "BESTWAY",
    productName: "Sterling Dual Capsule 20s",
    barcode: "5000143901234",
    packSize: "10 x 20s",
    quantity: 1,
    unitCost: 108.5,
    category: "Tobacco",
    rrp: 124.99,
    competitorPrice: 123.99,
    localPromoPrice: null,
    promotionalText: "Age restricted item",
  },
];

const setupStepLabels = [
  "Business details",
  "Country",
  "Currency",
  "Tax settings",
  "Upload first supplier invoice",
  "Connect bank account",
  "Import POS data",
  "Complete setup",
];

const subscriptionPlans = [
  {
    id: "starter",
    name: "Starter",
    priceLabel: "Free",
    audience: "Single small store",
    features: ["Basic dashboard", "Sales overview", "Limited reports", "100 invoice uploads per month", "Basic AI assistance", "1 user", "Community support"],
    limits: { stores: 1, users: 1, invoiceUploads: 100, aiUsage: "Basic", storage: "1 GB", reports: "Limited", apiAccess: false },
  },
  {
    id: "professional",
    name: "Professional",
    priceLabel: "Monthly subscription",
    audience: "Independent retailers",
    features: ["Unlimited invoice uploads", "AI invoice processing", "Cash flow forecasting", "Banking recommendations", "Supplier price comparison", "Inventory management", "Advanced reports", "Unlimited charts", "Mobile app", "Up to 10 users", "Email support"],
    limits: { stores: 1, users: 10, invoiceUploads: "Unlimited", aiUsage: "Professional", storage: "50 GB", reports: "Advanced", apiAccess: false },
  },
  {
    id: "business",
    name: "Business",
    priceLabel: "Monthly subscription",
    audience: "Multiple stores",
    features: ["Unlimited stores", "Multi-store dashboard", "AI forecasting", "Team management", "Advanced analytics", "Benchmarking", "API access", "Priority support"],
    limits: { stores: "Unlimited", users: "Unlimited", invoiceUploads: "Unlimited", aiUsage: "Business", storage: "250 GB", reports: "Advanced analytics", apiAccess: true },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceLabel: "Custom pricing",
    audience: "Large retail groups",
    features: ["Unlimited everything", "Dedicated account manager", "Custom integrations", "White-label options", "Single Sign-On", "SLA support"],
    limits: { stores: "Unlimited", users: "Unlimited", invoiceUploads: "Unlimited", aiUsage: "Enterprise", storage: "Custom", reports: "Custom", apiAccess: true },
  },
];

const authProviders = [
  { id: "email", name: "Email and password", type: "password", enabled: true },
  { id: "google", name: "Google", type: "oidc", enabled: true },
  { id: "microsoft", name: "Microsoft", type: "oidc", enabled: true },
  { id: "apple", name: "Apple", type: "oidc", enabled: true },
  { id: "github", name: "GitHub", type: "oidc", enabled: true, optional: true },
  { id: "facebook", name: "Facebook", type: "oidc", enabled: true, optional: true },
];

const roleDefinitions = [
  { id: "owner", name: "Owner", permissions: ["all"] },
  { id: "administrator", name: "Administrator", permissions: ["dashboard", "billing", "team", "settings", "reports", "invoices"] },
  { id: "manager", name: "Manager", permissions: ["dashboard", "reports", "invoices", "stock", "pricing", "team-view"] },
  { id: "supervisor", name: "Supervisor", permissions: ["dashboard", "tasks", "logs", "stock-view"] },
  { id: "cashier", name: "Cashier", permissions: ["tasks", "logs", "sales-view"] },
  { id: "accountant", name: "Accountant", permissions: ["billing", "reports", "invoices", "tax", "banking"] },
  { id: "inventory-manager", name: "Inventory Manager", permissions: ["stock", "orders", "suppliers", "labels"] },
  { id: "read-only", name: "Read-only User", permissions: ["dashboard-view", "reports-view"] },
  { id: "custom", name: "Custom Role", permissions: ["configurable"] },
];

const staff = [
  staffMember("u1", "Arti", "Supervisor", "s1", true, "A"),
  staffMember("u2", "Siva", "Supervisor", "s1", true, "S"),
  staffMember("u3", "Sahana", "Supervisor", "s1", false, "SA"),
  staffMember("u4", "Sandhiya", "Supervisor", "s1", false, "SN"),
  staffMember("u5", "Abinath", "Supervisor", "s1", false, "AB"),
  staffMember("u6", "Divya", "Supervisor", "s2", true, "D"),
  staffMember("u7", "Puvan", "Supervisor", "s2", true, "P"),
  staffMember("u8", "Pasinthu", "Supervisor", "s2", false, "PA"),
  staffMember("u9", "Nisanthan", "Supervisor", "s2", false, "N"),
  staffMember("u10", "Deepanshu", "Supervisor", "s2", false, "DE"),
  staffMember("u11", "Vishnu", "Supervisor", "s3", true, "V"),
  staffMember("u12", "Vijekumar", "Area Manager", "s3", false, "VI"),
  staffMember("u13", "Keeran", "Sales Assistant", "s3", false, "K"),
  staffMember("u14", "Denis", "Director", "s3", true, "D"),
  staffMember("u15", "Ananth", "Training Manager", "s3", false, "AN"),
  staffMember("u16", "Amen", "Delivery Manager", "s4", true, "AM"),
  staffMember("u17", "Partap", "Delivery Man", "s4", false, "P"),
  staffMember("u18", "User 1", "Sales Assistant", "s4", false, "U1"),
  staffMember("u19", "User 2", "Sales Assistant", "s4", false, "U2"),
  staffMember("u20", "User 3", "Sales Assistant", "s4", false, "U3"),
  staffMember("u21", "User 4", "Sales Assistant", "s1", false, "U4"),
];

const staffRoles = Object.fromEntries(staff.map((person) => [person.name, person.role]));

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
  return { id, name, role, storeId, postOffice, initials, pinHash: hashPin("2505"), passwordHash: hashPassword(defaultStaffPassword(name)) };
}

function defaultStaffPassword(name) {
  return `${String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "")}2505`;
}

function hashPin(pin) {
  return crypto.createHash("sha256").update(String(pin)).digest("hex");
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const digest = crypto.pbkdf2Sync(String(password), salt, 120000, 32, "sha256").toString("hex");
  return `${salt}:${digest}`;
}

function verifyPassword(password, storedHash = "") {
  const [salt, digest] = String(storedHash).split(":");
  if (!salt || !digest) return false;
  const candidate = hashPassword(password, salt).split(":")[1];
  return crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(digest, "hex"));
}

function validatePassword(password) {
  const value = String(password || "");
  const issues = [];
  if (value.length < 10) issues.push("at least 10 characters");
  if (!/[A-Z]/.test(value)) issues.push("one uppercase letter");
  if (!/[a-z]/.test(value)) issues.push("one lowercase letter");
  if (!/[0-9]/.test(value)) issues.push("one number");
  if (!/[^A-Za-z0-9]/.test(value)) issues.push("one symbol");
  return issues;
}

function verificationCode() {
  return String(crypto.randomInt(100000, 999999));
}

function dateParts(dateInput = new Date()) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const isoDate = date.toISOString().slice(0, 10);
  return {
    date: isoDate,
    month: isoDate.slice(0, 7),
    time: date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }),
    timestamp: date.toISOString(),
  };
}

function withEntryMeta(entry, entryType, staffName, dateInput = new Date()) {
  const parts = dateParts(dateInput);
  return {
    id: entry.id || `${entryType}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    entryType,
    date: entry.date || parts.date,
    month: entry.month || parts.month,
    time: entry.time || parts.time,
    timestamp: entry.timestamp || parts.timestamp,
    staff: entry.staff || staffName || "System",
    notes: entry.notes || "",
    auditTrail: entry.auditTrail || [],
    ...entry,
  };
}

function normalizeTemperature(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  const numeric = Number(trimmed);
  if (Number.isNaN(numeric)) return trimmed;
  return String(numeric);
}

function publicStaff(person) {
  const { pin, pinHash, passwordHash, ...safePerson } = person;
  return safePerson;
}

function publicAccount(account) {
  if (!account) return null;
  const { passwordHash, emailVerification, passwordReset, twoFactorSecret, ...safeAccount } = account;
  return safeAccount;
}

function accountPrincipal(account) {
  return {
    id: account.id,
    accountType: "customer",
    name: account.ownerName,
    email: account.email,
    role: "Owner",
    initials: initialsFor(account.ownerName),
    postOffice: true,
    emailVerified: account.emailVerified,
    twoFactorEnabled: account.security?.twoFactorEnabled || false,
    platformAdmin: Boolean(account.isPlatformAdmin),
  };
}

function staffPrincipal(person) {
  return { ...publicStaff(person), accountType: "staff", emailVerified: true };
}

function initialsFor(name = "") {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function marginPercent(price, cost) {
  const sellingPrice = Number(price) || 0;
  const costPrice = Number(cost) || 0;
  if (!sellingPrice) return 0;
  return Math.round(((sellingPrice - costPrice) / sellingPrice) * 1000) / 10;
}

function priceForMargin(cost, desiredMargin) {
  const margin = Math.min(Math.max(Number(desiredMargin) || 25, 1), 80) / 100;
  const raw = (Number(cost) || 0) / (1 - margin);
  return charmPrice(raw);
}

function charmPrice(value) {
  const raw = Number(value) || 0;
  if (raw <= 0) return 0;
  const pounds = Math.floor(raw);
  const candidate = roundMoney(pounds + 0.99);
  return candidate >= raw ? candidate : roundMoney(pounds + 1.99);
}

function productId(productName, barcode) {
  return crypto
    .createHash("sha1")
    .update(`${barcode || ""}:${productName}`)
    .digest("hex")
    .slice(0, 12);
}

function templateLine(template, store, desiredMargin = store.desiredMargin) {
  const minimumSellingPrice = priceForMargin(template.unitCost, desiredMargin);
  const regionalLift = store.region === "Merseyside" ? 0 : store.region === "Wirral" ? -0.1 : 0.1;
  const rrp = charmPrice(template.rrp + regionalLift);
  const suggestedSellingPrice = Math.max(minimumSellingPrice, Math.min(rrp, template.competitorPrice || rrp));
  const totalCost = roundMoney(template.quantity * template.unitCost);

  return {
    id: productId(template.productName, template.barcode),
    supplierName: template.supplier,
    productName: template.productName,
    barcode: template.barcode,
    packSize: template.packSize,
    quantity: template.quantity,
    unitCost: roundMoney(template.unitCost),
    totalCost,
    category: template.category,
    rrp,
    minimumSellingPrice,
    competitorPrice: template.competitorPrice,
    localPromoPrice: template.localPromoPrice,
    promotionalText: template.promotionalText,
    suggestedSellingPrice: roundMoney(suggestedSellingPrice),
    margin: marginPercent(rrp, template.unitCost),
    expectedMargin: marginPercent(suggestedSellingPrice, template.unitCost),
    rrpSource: `${store.country} ${store.region} RRP`,
  };
}

function templatesForSupplier(supplierName) {
  const exactMatches = productTemplates.filter((template) => template.supplier === supplierName);
  if (exactMatches.length) return exactMatches;
  return productTemplates.slice(0, 3).map((template) => ({ ...template, supplier: supplierName || template.supplier }));
}

function buildInvoice(store, user, body = {}) {
  const supplierName = body.supplierName || body.supplier || "JAMES HALL SPAR";
  const desiredMargin = Number(body.desiredMargin || store.desiredMargin || 25);
  const invoiceDate = body.invoiceDate || new Date().toISOString().slice(0, 10);
  const invoiceNumber =
    body.invoiceNumber ||
    `${supplierName.replace(/[^A-Z0-9]/gi, "").slice(0, 6).toUpperCase()}-${invoiceDate.replace(/-/g, "")}`;
  const lines = templatesForSupplier(supplierName).map((template) => templateLine(template, store, desiredMargin));
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.totalCost, 0));
  const taxTotal = roundMoney(body.taxTotal || (subtotal * (store.taxRate || 0)) / 100);
  const total = roundMoney(subtotal + taxTotal);

  return {
    id: `inv-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    supplierName,
    invoiceNumber,
    invoiceDate,
    country: store.country,
    region: store.region,
    currency: store.currency,
    taxName: store.taxName || "VAT/GST",
    taxTotal,
    subtotal,
    total,
    desiredMargin,
    fileName: body.fileName || body.file?.name || "",
    fileType: body.fileType || body.file?.type || "",
    processedAt: new Date().toISOString(),
    processedBy: user?.name || "AI Invoice Processor",
    extractionStatus: "Saved",
    lines,
  };
}

function productFromLine(line, invoice) {
  return {
    id: line.id,
    productName: line.productName,
    barcode: line.barcode,
    packSize: line.packSize,
    category: line.category,
    supplierName: invoice.supplierName,
    lastInvoiceNumber: invoice.invoiceNumber,
    lastInvoiceDate: invoice.invoiceDate,
    unitCost: line.unitCost,
    rrp: line.rrp,
    minimumSellingPrice: line.minimumSellingPrice,
    suggestedSellingPrice: line.suggestedSellingPrice,
    competitorPrice: line.competitorPrice,
    localPromoPrice: line.localPromoPrice,
    expectedMargin: line.expectedMargin,
    margin: line.margin,
    stockLevel: Math.max(8, line.quantity * 9),
    salesGrowth: line.category === "Soft Drinks" ? 12 : line.category === "Snacks" ? 9 : 5,
    customerTraffic: line.category === "Tobacco" ? 4 : 11,
  };
}

function upsertInvoiceProducts(records, invoice) {
  records.products ||= [];
  invoice.lines.forEach((line) => {
    const nextProduct = productFromLine(line, invoice);
    const index = records.products.findIndex((product) => product.id === nextProduct.id);
    if (index >= 0) {
      records.products[index] = { ...records.products[index], ...nextProduct };
    } else {
      records.products.push(nextProduct);
    }
  });
}

function seedBusinessHealth() {
  return {
    score: 92,
    rating: "Excellent",
    metrics: {
      cashFlow: 88,
      profitability: 91,
      stockLevels: 84,
      supplierPayments: 96,
      bankBalance: 90,
      debt: 86,
      taxLiabilities: 94,
      salesGrowth: 89,
      customerTraffic: 83,
    },
  };
}

function seedRecommendations() {
  return [
    {
      type: "Pricing",
      text: "Increase the selling price of Coca-Cola Original Taste by 0.20 to improve margin.",
      impact: "Expected margin improves by 1.2%.",
      priority: "High",
    },
    {
      type: "Supplier",
      text: "Buy Walkers crisps from PARFETTS this month to save 145.00.",
      impact: "Lower cost for a fast moving snack line.",
      priority: "Medium",
    },
    {
      type: "Cash flow",
      text: "Deposit 8000.00 today to cover upcoming direct debits.",
      impact: "Keeps supplier payments and tax reserves on track.",
      priority: "High",
    },
    {
      type: "Stock",
      text: "Order more Volvic Mineral Water before the weekend based on previous sales.",
      impact: "Avoids lost sales during high traffic periods.",
      priority: "Medium",
    },
  ];
}

function seedInvoiceForStore(store) {
  return buildInvoice(store, { name: "System" }, { supplierName: "JAMES HALL SPAR", invoiceNumber: `DEMO-${store.id.toUpperCase()}` });
}

function seedSetup() {
  return setupStepLabels.map((label, index) => ({
    id: index + 1,
    label,
    optional: index === 5 || index === 6,
    complete: index < 4,
  }));
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function trialWindow() {
  const start = new Date();
  const end = addDays(start, 30);
  return { start: start.toISOString(), end: end.toISOString() };
}

function planById(planId) {
  return subscriptionPlans.find((plan) => plan.id === planId) || subscriptionPlans[1];
}

function seedBillingProfile(storeId = "s1") {
  const trial = trialWindow();
  const currentPlan = planById("professional");
  const referralCode = `SP-${storeId.toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

  return {
    currentPlan: currentPlan.id,
    status: "trialing",
    billingCadence: "monthly",
    trialStartedAt: trial.start,
    trialEndsAt: trial.end,
    renewalDate: trial.end,
    noCardRequired: true,
    annualDiscountPercent: 15,
    paymentProviders: ["Stripe", "PayPal", "Apple Pay", "Google Pay"],
    limits: currentPlan.limits,
    paymentHistory: [
      {
        id: `pay-trial-${storeId}`,
        date: trial.start,
        description: "30-day free trial",
        amount: 0,
        status: "Active",
        invoiceNumber: `TRIAL-${storeId.toUpperCase()}`,
      },
    ],
    referral: {
      code: referralCode,
      link: `https://storepilot.ai/ref/${referralCode}`,
      successfulReferrals: 0,
      credits: 0,
      referrerReward: "One free month or account credit",
      newCustomerReward: "Discount on first subscription",
    },
    affiliate: {
      enabled: true,
      eligiblePartners: ["Accountants", "Consultants", "Wholesalers", "POS providers"],
      commission: "Recurring commission for every active referred customer",
    },
    whiteLabel: {
      available: true,
      audiences: ["Wholesalers", "Buying groups", "POS companies", "Franchise chains", "Retail consultants"],
      managedBy: "StorePilot AI",
    },
  };
}

function seedBusinessSnapshot() {
  return {
    todaysSales: 4280,
    todaysProfit: 1327,
    cashAvailable: 11840,
    bankBalance: 24650,
    moneyToDeposit: 8000,
    upcomingDirectDebits: 6200,
    supplierPayments: 9400,
    outstandingInvoices: 11750,
    topSellingProducts: ["Coca-Cola Original Taste", "Walkers Crisps", "Volvic Mineral Water"],
    worstPerformingProducts: ["Slow-moving seasonal confectionery", "Low margin chilled lines"],
    stockAlerts: ["Tobacco stock tight", "Order water before weekend"],
    weatherImpact: "Warm weekend forecast may lift soft drink and water demand.",
  };
}

function seedAccountSecurity() {
  return {
    passwordLastChangedAt: new Date().toISOString(),
    twoFactorEnabled: false,
    rememberDeviceEnabled: true,
    rememberedDevices: [
      { id: "dev-main", name: "Windows desktop", lastSeenAt: new Date().toISOString(), trusted: true },
    ],
    activeSessions: [
      { id: "sess-demo", device: "Current browser", location: "United Kingdom", lastActiveAt: new Date().toISOString() },
    ],
    loginAlerts: true,
  };
}

function seedCustomerPortal(store) {
  return {
    profile: {
      businessName: store.name,
      ownerName: "Denis",
      businessEmail: store.businessEmail,
      mobile: store.mobile,
      country: store.country,
      currency: store.currency,
      language: store.language,
      timeZone: store.timeZone,
      storeType: store.storeType,
      numberOfStores: stores.length,
      address: store.address,
      vatGstNumber: store.vatGstNumber,
      companyRegistrationNumber: store.companyRegistrationNumber,
    },
    aiUsage: {
      invoiceUploadsThisMonth: 42,
      monthlyLimit: "Unlimited",
      aiRequestsThisMonth: 1280,
      storageUsed: "6.4 GB",
      resetDate: addDays(new Date(), 18).toISOString(),
    },
    apiKeys: [
      { id: "key-live", name: "Live API key", prefix: "sp_live_", status: "Active", createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString() },
    ],
    notifications: [
      { id: "notif-email", channel: "Email", enabled: true, description: "Daily reports and security alerts" },
      { id: "notif-whatsapp", channel: "WhatsApp", enabled: true, description: "Urgent stock, cash, and supplier alerts" },
      { id: "notif-sms", channel: "SMS", enabled: false, description: "Fallback security codes" },
    ],
    connectedApps: [
      { id: "google-workspace", name: "Google Workspace", status: "Ready to connect", category: "Identity and email" },
      { id: "stripe", name: "Stripe", status: "Ready to connect", category: "Payments" },
      { id: "xero", name: "Xero", status: "Planned", category: "Accounting" },
      { id: "pos", name: "POS import", status: "Optional setup", category: "POS" },
    ],
    supportTickets: [
      { id: "sup-1", subject: "Welcome onboarding", status: "Open", priority: "Normal", updatedAt: new Date().toISOString() },
    ],
    sso: {
      availableOnPlan: "Enterprise",
      enabled: false,
      provider: "SAML / OpenID Connect",
      domains: [],
    },
    emailSetup: platformEmailSetup,
  };
}

function seedTeam(storeId) {
  const staffForStore = staff.filter((person) => person.storeId === storeId);
  return {
    members: staffForStore.map((person) => ({
      id: person.id,
      name: person.name,
      email: `${person.name.toLowerCase().replace(/[^a-z0-9]/g, ".")}@example.com`,
      role: person.role.includes("Manager") ? "Manager" : person.role.includes("Supervisor") ? "Supervisor" : "Cashier",
      status: "Active",
      permissions: roleDefinitions.find((role) => role.name === (person.role.includes("Manager") ? "Manager" : person.role.includes("Supervisor") ? "Supervisor" : "Cashier"))?.permissions || [],
    })),
    invites: [],
    roles: roleDefinitions,
  };
}

function seedUserAccounts() {
  return [
    {
      id: "acct-owner",
      ownerName: "Denis",
      email: platformAdminEmail,
      passwordHash: hashPassword("StorePilot2026!"),
      emailVerified: true,
      isPlatformAdmin: true,
      authProviders: ["email", "google", "microsoft", "apple", "github", "facebook"],
      memberships: stores.map((store) => ({ businessId: store.id, role: "Owner" })),
      defaultBusinessId: "s1",
      security: seedAccountSecurity(),
      emailVerification: { verifiedAt: new Date().toISOString(), code: "" },
      passwordReset: null,
      createdAt: new Date().toISOString(),
    },
  ];
}

function seedStoreRecords(storeId, storeOverride = null) {
  const store = storeOverride || stores.find((item) => item.id === storeId) || stores[0];
  const invoice = seedInvoiceForStore(store);
  const products = invoice.lines.map((line) => productFromLine(line, invoice));
  const today = dateParts();

  return {
    storeId,
    tasks: baseTasks.map((task) => ({ ...task })),
    temperatures: [
      withEntryMeta({ date: today.date, month: today.month, time: "07:15", unit: "Display Chiller 1", location: "Display Chiller 1", temp: "3.2", status: "In Range" }, "temperature", "Arti"),
      withEntryMeta({ date: today.date, month: today.month, time: "07:16", unit: "Freezer 1", location: "Freezer 1", temp: "-18.4", status: "In Range" }, "temperature", "Arti"),
    ],
    visitors: [
      withEntryMeta({ date: today.date, month: today.month, time: "07:20", name: "JAMES HALL SPAR", purpose: "Stock Delivery" }, "visitor", "Arti"),
      withEntryMeta({ date: today.date, month: today.month, time: "09:05", name: "PARFETTS", purpose: "Stock Delivery" }, "visitor", "Arti"),
    ],
    ageChecks: [
      withEntryMeta({ date: today.date, month: today.month, time: "08:02", outcome: "Approved", category: "Vape", notes: "ID checked" }, "age", "Arti"),
      withEntryMeta({ date: today.date, month: today.month, time: "08:10", outcome: "Refused", category: "Tobacco", notes: "No ID shown" }, "age", "Arti"),
    ],
    postOfficeLogs: [
      withEntryMeta({ date: today.date, month: today.month, time: "07:10", duty: "Open Procedure", status: "Completed" }, "post", "Arti"),
      withEntryMeta({ date: today.date, month: today.month, time: "07:45", duty: "Mail Bag Received", status: "Completed" }, "post", "Arti"),
      withEntryMeta({ date: today.date, month: today.month, time: "12:00", duty: "Midday Check", status: "Due" }, "post", ""),
      withEntryMeta({ date: today.date, month: today.month, time: "14:30", duty: "Mail Bag Dispatch", status: "Due" }, "post", ""),
      withEntryMeta({ date: today.date, month: today.month, time: "17:30", duty: "Close Down", status: "Due" }, "post", ""),
      withEntryMeta({ date: today.date, month: today.month, time: "17:45", duty: "Cash Balancing", status: "Due" }, "post", ""),
    ],
    payouts: [],
    deliveries: [],
    auditTrail: [],
    invoices: [invoice],
    products,
    labelJobs: [],
    promotions: [],
    businessHealth: seedBusinessHealth(),
    businessSnapshot: seedBusinessSnapshot(),
    recommendations: seedRecommendations(),
    setup: seedSetup(),
    billing: seedBillingProfile(storeId),
    customerPortal: seedCustomerPortal(store),
    team: seedTeam(storeId),
  };
}

function defaultData() {
  return {
    stores,
    staff,
    userAccounts: seedUserAccounts(),
    suppliers,
    customers: [],
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

  changed = ensureDataShape(data) || changed;
  data.staff = data.staff.filter((person) => {
    if (String(person.name || "").trim().toLowerCase() === "user 5") {
      changed = true;
      return false;
    }
    return true;
  }).map((person) => {
    if (staffRoles[person.name] && person.role !== staffRoles[person.name]) {
      person.role = staffRoles[person.name];
      changed = true;
    }
    if (!person.passwordHash) {
      person.passwordHash = hashPassword(defaultStaffPassword(person.name));
      changed = true;
    }
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

function ensureDataShape(data) {
  let changed = false;

  if (!data.customers) {
    data.customers = [];
    changed = true;
  }
  if (!data.userAccounts) {
    data.userAccounts = seedUserAccounts();
    changed = true;
  }
  const ownerAccount =
    data.userAccounts.find((account) => account.email === platformAdminEmail) ||
    data.userAccounts.find((account) => account.email === "owner@storepilot.ai") ||
    data.userAccounts.find((account) => account.id === "acct-owner");
  if (ownerAccount) {
    if (ownerAccount.email !== platformAdminEmail) {
      ownerAccount.email = platformAdminEmail;
      changed = true;
    }
    if (!ownerAccount.isPlatformAdmin) {
      ownerAccount.isPlatformAdmin = true;
      changed = true;
    }
  }
  (data.customers || []).forEach((customer) => {
    if (customer.email === "owner@storepilot.ai") {
      customer.email = platformAdminEmail;
      changed = true;
    }
    if (customer.businessEmail === "owner@storepilot.ai") {
      customer.businessEmail = platformAdminEmail;
      changed = true;
    }
  });
  const firstStore = (data.stores || []).find((store) => store.id === "s1");
  if (firstStore && firstStore.businessEmail !== platformAdminEmail) {
    firstStore.businessEmail = platformAdminEmail;
    changed = true;
  }
  if (!data.refunds) {
    data.refunds = [];
    changed = true;
  }
  if (!data.suppliers) {
    data.suppliers = suppliers;
    changed = true;
  }
  if (!data.records) {
    data.records = {};
    changed = true;
  }

  const existingStores = data.stores || [];
  const baseStores = stores.map((store) => {
    const existing = (data.stores || []).find((item) => item.id === store.id) || {};
    const merged = { ...store, ...existing };
    Object.keys(store).forEach((key) => {
      if (merged[key] === undefined || merged[key] === "") {
        merged[key] = store[key];
        changed = true;
      }
    });
    return merged;
  });
  const customStores = existingStores.filter((store) => !stores.some((baseStore) => baseStore.id === store.id));
  data.stores = [...baseStores, ...customStores];

  data.stores.forEach((store) => {
    if (!data.records[store.id]) {
      data.records[store.id] = seedStoreRecords(store.id, store);
      changed = true;
      return;
    }

    const records = data.records[store.id];
    records.invoices ||= [];
    records.products ||= [];
    records.ageChecks ||= [];
    records.temperatures ||= [];
    records.visitors ||= [];
    records.postOfficeLogs ||= [];
    records.payouts ||= [];
    records.deliveries ||= [];
    records.auditTrail ||= [];
    ["temperatures", "visitors", "ageChecks", "postOfficeLogs", "payouts", "deliveries"].forEach((collection) => {
      records[collection] = records[collection].map((entry) => {
        const type = collection === "ageChecks" ? "age" : collection === "postOfficeLogs" ? "post" : collection.replace(/s$/, "");
        const upgraded = withEntryMeta(entry, type, entry.staff || "System");
        if (collection === "temperatures") {
          upgraded.unit = upgraded.unit || upgraded.location;
          upgraded.location = upgraded.location || upgraded.unit;
          upgraded.temp = normalizeTemperature(upgraded.temp);
        }
        return upgraded;
      });
    });
    changed = true;
    records.labelJobs ||= [];
    records.promotions ||= [];
    records.businessHealth ||= seedBusinessHealth();
    records.businessSnapshot ||= seedBusinessSnapshot();
    records.recommendations ||= seedRecommendations();
    records.setup ||= seedSetup();
    records.billing ||= seedBillingProfile(store.id);
    records.customerPortal ||= seedCustomerPortal(store);
    records.team ||= seedTeam(store.id);
    records.customerPortal.emailSetup ||= platformEmailSetup;
    records.customerPortal.connectedApps ||= [];
    if (!records.customerPortal.connectedApps.some((app) => app.id === "google-workspace")) {
      records.customerPortal.connectedApps.unshift({ id: "google-workspace", name: "Google Workspace", status: "Ready to connect", category: "Identity and email" });
      changed = true;
    }
    if (records.customerPortal.profile?.businessEmail === "owner@storepilot.ai") {
      records.customerPortal.profile.businessEmail = platformAdminEmail;
      changed = true;
    }

    if (!records.invoices.length) {
      const invoice = seedInvoiceForStore(store);
      records.invoices.push(invoice);
      upsertInvoiceProducts(records, invoice);
      changed = true;
    }

    if (!records.products.length && records.invoices.length) {
      records.invoices.forEach((invoice) => upsertInvoiceProducts(records, invoice));
      changed = true;
    }

    records.ageChecks.forEach((row) => {
      if (row.category) return;
      const note = String(row.notes || "");
      const matchedCategory = ["Vape", "Tobacco", "Alcohol", "Lottery"].find((category) => note.toLowerCase().includes(category.toLowerCase()));
      row.category = matchedCategory || "Other Age Restricted Item";
      if (matchedCategory && row.notes === matchedCategory) row.notes = row.outcome === "Approved" ? "ID checked" : matchedCategory;
      changed = true;
    });
  });

  return changed;
}

function writeData(data) {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
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
  const store = data.stores.find((item) => item.id === storeId) || stores[0];
  return {
    storeId,
    records: data.records[storeId] || seedStoreRecords(storeId, store),
    staff: data.staff.map(publicStaff),
  };
}

function accountBusinessIds(account) {
  return (account?.memberships || []).map((membership) => membership.businessId);
}

function sessionCanAccessStore(session, storeId, account) {
  if (session.type === "staff") return dataStoreExists(storeId);
  return accountBusinessIds(account).includes(storeId);
}

function dataStoreExists(storeId) {
  return stores.some((store) => store.id === storeId);
}

function isPlatformAdmin(user, account) {
  return Boolean(user?.platformAdmin || account?.isPlatformAdmin);
}

function buildBackOffice(data) {
  const customerRows = (data.stores || []).map((store) => {
    const customer = (data.customers || []).find((item) => item.businessId === store.id || item.businessName === store.name);
    const records = data.records?.[store.id] || {};
    const billing = records.billing || seedBillingProfile(store.id);
    const portal = records.customerPortal || seedCustomerPortal(store);
    return {
      businessId: store.id,
      customerId: customer?.id || "",
      businessName: portal.profile?.businessName || store.name,
      ownerName: customer?.ownerName || portal.profile?.ownerName || "Owner",
      email: customer?.email || portal.profile?.businessEmail || store.businessEmail || "",
      mobile: customer?.mobile || portal.profile?.mobile || store.mobile || "",
      country: portal.profile?.country || store.country,
      plan: billing.currentPlan,
      billingStatus: billing.status,
      trialEndsAt: billing.trialEndsAt,
      renewalDate: billing.renewalDate,
      invoiceCount: (records.invoices || []).length,
      aiRequests: portal.aiUsage?.aiRequestsThisMonth || 0,
      accountCredit: billing.referral?.credits || 0,
      totalPaid: (billing.paymentHistory || []).reduce((sum, item) => sum + Math.max(0, Number(item.amount) || 0), 0),
      totalRefunded: (data.refunds || []).filter((refund) => refund.businessId === store.id).reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    };
  });

  return {
    summary: {
      customers: customerRows.length,
      trialing: customerRows.filter((row) => row.billingStatus === "trialing").length,
      active: customerRows.filter((row) => row.billingStatus === "active").length,
      refunds: (data.refunds || []).length,
      revenue: customerRows.reduce((sum, row) => sum + row.totalPaid, 0),
    },
    customers: customerRows,
    refunds: data.refunds || [],
  };
}

function pdfEscape(value) {
  return String(value ?? "").replace(/[\\()]/g, "\\$&").replace(/[^\x20-\x7E]/g, " ");
}

function createSimplePdf(title, lines) {
  const contentLines = [title, "", ...lines].slice(0, 220);
  const text = contentLines
    .map((line, index) => `BT /F1 9 Tf 40 ${790 - index * 12} Td (${pdfEscape(line).slice(0, 120)}) Tj ET`)
    .join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf);
}

function sendPdf(response, fileName, buffer) {
  response.writeHead(200, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Content-Length": buffer.length,
  });
  response.end(buffer);
}

function audit(records, action, entryType, entryId, user, reason, before = null, after = null) {
  records.auditTrail ||= [];
  const parts = dateParts();
  records.auditTrail.unshift({
    id: `audit-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    action,
    entryType,
    entryId,
    staff: user.name,
    date: parts.date,
    month: parts.month,
    time: parts.time,
    timestamp: parts.timestamp,
    reason: reason || "No reason entered",
    before,
    after,
  });
}

async function handleApi(request, response, pathname) {
  const data = readData();

  if (request.method === "GET" && pathname === "/api/bootstrap") {
    sendJson(response, 200, {
      stores: data.stores,
      staff: [],
      suppliers: data.suppliers,
      subscriptionPlans,
      authProviders,
      roleDefinitions,
      platformEmailSetup,
    });
    return;
  }

  if (request.method === "POST" && pathname === "/api/register") {
    const body = await readBody(request);
    if (!body.businessName || !body.ownerName || !body.email || !body.mobile || !body.password) {
      sendJson(response, 400, { message: "Business name, owner name, email, mobile number, and password are required" });
      return;
    }

    const passwordIssues = validatePassword(body.password);
    if (passwordIssues.length) {
      sendJson(response, 400, { message: `Password must include ${passwordIssues.join(", ")}` });
      return;
    }

    const email = String(body.email).trim().toLowerCase();
    const existing = [...(data.customers || []), ...(data.userAccounts || [])].find((customer) => customer.email.toLowerCase() === email);
    if (existing) {
      sendJson(response, 409, { message: "This email address is already registered" });
      return;
    }

    const customerId = `cust-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const businessId = `biz-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const code = verificationCode();
    const customer = {
      id: customerId,
      businessId,
      businessName: body.businessName,
      ownerName: body.ownerName,
      email,
      mobile: body.mobile,
      country: body.country || "United Kingdom",
      currency: body.currency || "GBP",
      language: body.language || "English",
      timeZone: body.timeZone || "Europe/London",
      storeType: body.storeType || "Convenience Store",
      numberOfStores: Number(body.numberOfStores || 1),
      address: body.address || "",
      companyRegistrationNumber: body.companyRegistrationNumber || body.businessRegistrationNumber || "",
      taxNumber: body.taxNumber || body.vatNumber || "",
      emailVerified: false,
      authProviders: ["email"],
      emailVerification: {
        code,
        sentAt: new Date().toISOString(),
        link: `https://storepilot.ai/verify?email=${encodeURIComponent(email)}&code=${code}`,
      },
      setup: seedSetup(),
      subscription: seedBillingProfile(customerId),
      createdAt: new Date().toISOString(),
    };
    const store = {
      id: businessId,
      name: body.businessName,
      country: body.country || "United Kingdom",
      region: body.region || body.address || "Local",
      currency: body.currency || "GBP",
      language: body.language || "English",
      timeZone: body.timeZone || "Europe/London",
      taxName: String(body.country || "United Kingdom").toLowerCase().includes("united states") ? "Sales Tax" : "VAT/GST",
      taxRate: 20,
      storeType: body.storeType || "Convenience Store",
      address: body.address || "",
      businessEmail: email,
      mobile: body.mobile,
      vatGstNumber: body.taxNumber || body.vatNumber || "",
      companyRegistrationNumber: body.companyRegistrationNumber || body.businessRegistrationNumber || "",
      desiredMargin: 25,
    };

    const account = {
      id: `acct-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      ownerName: body.ownerName,
      email,
      passwordHash: hashPassword(body.password),
      emailVerified: false,
      authProviders: ["email"],
      memberships: [{ businessId, role: "Owner" }],
      defaultBusinessId: businessId,
      security: seedAccountSecurity(),
      emailVerification: { code, sentAt: new Date().toISOString(), verifiedAt: "" },
      passwordReset: null,
      createdAt: new Date().toISOString(),
    };

    data.customers ||= [];
    data.userAccounts ||= [];
    data.stores ||= [];
    data.records ||= {};
    data.customers.push(customer);
    data.userAccounts.push(account);
    data.stores.push(store);
    data.records[businessId] = seedStoreRecords(businessId, store);
    writeData(data);
    sendJson(response, 201, {
      customer,
      message: `Verification email queued for ${customer.email}. Demo code: ${code}`,
      verificationCode: code,
    });
    return;
  }

  if (request.method === "POST" && pathname === "/api/verify-email") {
    const body = await readBody(request);
    const email = String(body.email || "").trim().toLowerCase();
    const code = String(body.code || "").trim();
    const account = (data.userAccounts || []).find((item) => item.email === email);
    const customer = (data.customers || []).find((item) => item.email === email);

    if (!account || !code || account.emailVerification?.code !== code) {
      sendJson(response, 400, { message: "Invalid verification code" });
      return;
    }

    account.emailVerified = true;
    account.emailVerification.verifiedAt = new Date().toISOString();
    if (customer) {
      customer.emailVerified = true;
      customer.emailVerification ||= {};
      customer.emailVerification.verifiedAt = account.emailVerification.verifiedAt;
    }
    writeData(data);
    sendJson(response, 200, { account: publicAccount(account), message: "Email verified. You can now sign in." });
    return;
  }

  if (request.method === "POST" && pathname === "/api/password-reset") {
    const body = await readBody(request);
    const email = String(body.email || "").trim().toLowerCase();
    const account = (data.userAccounts || []).find((item) => item.email === email);
    if (!account) {
      sendJson(response, 200, { message: "If the account exists, a reset email has been queued." });
      return;
    }
    const code = verificationCode();
    account.passwordReset = {
      code,
      requestedAt: new Date().toISOString(),
      expiresAt: addDays(new Date(), 1).toISOString(),
      link: `https://storepilot.ai/reset-password?email=${encodeURIComponent(email)}&code=${code}`,
    };
    writeData(data);
    sendJson(response, 200, { message: `Password reset email queued. Demo code: ${code}`, resetCode: code });
    return;
  }

  if (request.method === "POST" && pathname === "/api/account-login") {
    const body = await readBody(request);
    const email = String(body.email || "").trim().toLowerCase();
    const account = (data.userAccounts || []).find((item) => item.email === email);
    if (!account || !verifyPassword(body.password, account.passwordHash)) {
      sendJson(response, 401, { message: "Wrong email or password" });
      return;
    }
    if (!account.emailVerified) {
      sendJson(response, 403, { message: "Please verify your email before signing in", verificationRequired: true });
      return;
    }
    if (account.security?.twoFactorEnabled && String(body.twoFactorCode || "") !== "123456") {
      sendJson(response, 401, { message: "Enter your 2FA code. Demo code: 123456", twoFactorRequired: true });
      return;
    }

    const businessIds = accountBusinessIds(account);
    const storeId = body.storeId && businessIds.includes(body.storeId) ? body.storeId : account.defaultBusinessId || businessIds[0] || data.stores[0]?.id;
    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, {
      type: "account",
      accountId: account.id,
      storeId,
      createdAt: Date.now(),
      rememberDevice: Boolean(body.rememberDevice),
    });
    account.security ||= seedAccountSecurity();
    account.security.activeSessions ||= [];
    account.security.activeSessions.unshift({
      id: token.slice(0, 10),
      device: body.rememberDevice ? "Remembered browser" : "Browser session",
      location: "United Kingdom",
      lastActiveAt: new Date().toISOString(),
    });
    writeData(data);
    sendJson(response, 200, {
      token,
      user: accountPrincipal(account),
      account: publicAccount(account),
      availableStoreIds: businessIds,
      ...storePayload(data, storeId),
    });
    return;
  }

  if (request.method === "POST" && pathname === "/api/oauth-login") {
    const body = await readBody(request);
    const provider = authProviders.find((item) => item.id === body.provider);
    if (!provider || provider.type !== "oidc") {
      sendJson(response, 400, { message: "Unknown sign-in provider" });
      return;
    }
    sendJson(response, 200, {
      message: `${provider.name} is configured as an OpenID Connect provider placeholder. Add provider credentials to enable live sign-in.`,
      provider,
    });
    return;
  }

  if (request.method === "POST" && pathname === "/api/login") {
    const body = await readBody(request);
    const staffCode = String(body.staffName || body.staffCode || body.staffId || "").trim().toLowerCase();
    const user = data.staff.find((person) =>
      [person.id, person.initials, person.name].some((value) => String(value || "").toLowerCase() === staffCode)
    );
    const store = data.stores.find((item) => item.id === body.storeId) || data.stores.find((item) => item.id === user?.storeId);

    if (!user || !store || !verifyPassword(body.password, user.passwordHash)) {
      sendJson(response, 401, { message: "Wrong staff name or password" });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, { type: "staff", userId: user.id, storeId: store.id, createdAt: Date.now() });
    sendJson(response, 200, {
      token,
      user: staffPrincipal(user),
      ...storePayload(data, store.id),
    });
    return;
  }

  const session = getSession(request);
  if (!session) {
    sendJson(response, 401, { message: "Please log in again" });
    return;
  }

  const account = session.type === "account" ? (data.userAccounts || []).find((item) => item.id === session.accountId) : null;
  const staffUser = session.type !== "account" ? data.staff.find((person) => person.id === session.userId) : null;
  const user = account ? accountPrincipal(account) : staffUser ? staffPrincipal(staffUser) : null;
  if (!user) {
    sendJson(response, 401, { message: "Please log in again" });
    return;
  }
  const userStoreId = session.storeId;
  const activeStore = data.stores.find((store) => store.id === userStoreId) || stores[0];
  data.records[userStoreId] ||= seedStoreRecords(userStoreId, activeStore);
  const records = data.records[userStoreId];

  if (request.method === "GET" && pathname === "/api/state") {
    sendJson(response, 200, {
      user,
      account: publicAccount(account),
      availableStoreIds: account ? accountBusinessIds(account) : data.stores.map((store) => store.id),
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
    if (account && !isPlatformAdmin(user, account) && !accountBusinessIds(account).includes(body.storeId)) {
      sendJson(response, 403, { message: "This account does not have access to that business" });
      return;
    }
    session.storeId = body.storeId;
    data.records[body.storeId] ||= seedStoreRecords(body.storeId, data.stores.find((store) => store.id === body.storeId));
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

  if (request.method === "POST" && pathname === "/api/invoices/process") {
    const body = await readBody(request);
    const invoice = buildInvoice(activeStore, user, body);
    records.invoices ||= [];
    records.invoices.unshift(invoice);
    upsertInvoiceProducts(records, invoice);
    records.setup ||= seedSetup();
    const invoiceStep = records.setup.find((step) => step.id === 5);
    if (invoiceStep) invoiceStep.complete = true;
    writeData(data);
    sendJson(response, 200, storePayload(data, userStoreId));
    return;
  }

  if (request.method === "POST" && pathname === "/api/label-jobs") {
    const body = await readBody(request);
    const productIds = Array.isArray(body.productIds) ? body.productIds : [];
    const selectedProducts = productIds.length
      ? (records.products || []).filter((product) => productIds.includes(product.id))
      : (records.products || []).slice(0, 6);

    const job = {
      id: `lbl-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      type: body.type || "Shelf edge labels",
      size: body.size || "90 x 38mm",
      productIds: selectedProducts.map((product) => product.id),
      productCount: selectedProducts.length,
      status: "Ready to print",
      createdAt: new Date().toISOString(),
      createdBy: user.name,
    };

    records.labelJobs ||= [];
    records.labelJobs.unshift(job);
    writeData(data);
    sendJson(response, 200, storePayload(data, userStoreId));
    return;
  }

  if (request.method === "POST" && pathname === "/api/promotions") {
    const body = await readBody(request);
    const requestedIds = Array.isArray(body.productIds) && body.productIds.length ? body.productIds : body.productId ? [body.productId] : [];
    const selectedProducts = requestedIds.length
      ? (records.products || []).filter((item) => requestedIds.includes(item.id))
      : (records.products || []).slice(0, 1);
    const promotionProducts = selectedProducts.length ? selectedProducts : (records.products || []).slice(0, 1);
    const primaryProduct = promotionProducts[0];
    if (!primaryProduct) {
      sendJson(response, 400, { message: "Process an invoice before creating promotions" });
      return;
    }

    const offer = body.offer || `${activeStore.currency} value deal`;
    const productNames = promotionProducts.map((product) => product.productName);
    const displayNames = productNames.length > 3 ? `${productNames.slice(0, 3).join(", ")} +${productNames.length - 3} more` : productNames.join(", ");
    const promotion = {
      id: `promo-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      productId: primaryProduct.id,
      productIds: promotionProducts.map((product) => product.id),
      productName: displayNames,
      category: promotionProducts.length > 1 ? "Multi-product" : primaryProduct.category,
      offer,
      channels: Array.isArray(body.channels) && body.channels.length ? body.channels : ["Poster", "Facebook", "Instagram", "WhatsApp"],
      status: "Generated",
      createdAt: new Date().toISOString(),
      createdBy: user.name,
      assets: {
        posterHeadline: `${offer}`,
        posterSubhead: displayNames,
        windowPoster: `${promotionProducts.length > 1 ? "Selected products" : primaryProduct.category} offer at ${activeStore.name}`,
        facebookPost: `${offer} on ${displayNames}. Available now at ${activeStore.name}.`,
        instagramPost: `${offer} | ${displayNames} | ${activeStore.region}`,
        whatsappImageText: `${offer}\n${displayNames}\n${activeStore.name}`,
      },
    };

    records.promotions ||= [];
    records.promotions.unshift(promotion);
    writeData(data);
    sendJson(response, 200, storePayload(data, userStoreId));
    return;
  }

  if (request.method === "POST" && pathname === "/api/billing/plan") {
    const body = await readBody(request);
    records.billing ||= seedBillingProfile(userStoreId);
    const billing = records.billing;
    billing.paymentHistory ||= [];
    const now = new Date().toISOString();

    if (body.action === "cancel") {
      billing.status = "canceling";
      billing.cancelAtPeriodEnd = true;
      billing.paymentHistory.unshift({
        id: `pay-${Date.now()}`,
        date: now,
        description: "Subscription cancellation scheduled",
        amount: 0,
        status: "Scheduled",
        invoiceNumber: `CN-${Date.now()}`,
      });
    } else if (body.action === "reactivate") {
      billing.status = billing.trialEndsAt && new Date(billing.trialEndsAt) > new Date() ? "trialing" : "active";
      billing.cancelAtPeriodEnd = false;
      billing.paymentHistory.unshift({
        id: `pay-${Date.now()}`,
        date: now,
        description: "Subscription reactivated",
        amount: 0,
        status: "Active",
        invoiceNumber: `RX-${Date.now()}`,
      });
    } else {
      const nextPlan = planById(body.planId || billing.currentPlan);
      billing.currentPlan = nextPlan.id;
      billing.billingCadence = body.billingCadence || billing.billingCadence || "monthly";
      billing.status = billing.status === "trialing" ? "trialing" : "active";
      billing.limits = nextPlan.limits;
      billing.renewalDate = addDays(new Date(), billing.billingCadence === "annual" ? 365 : 30).toISOString();
      billing.paymentHistory.unshift({
        id: `pay-${Date.now()}`,
        date: now,
        description: `${nextPlan.name} plan selected (${billing.billingCadence})`,
        amount: 0,
        status: billing.status === "trialing" ? "Trial" : "Pending payment setup",
        invoiceNumber: `SUB-${Date.now()}`,
      });
    }

    writeData(data);
    sendJson(response, 200, storePayload(data, userStoreId));
    return;
  }

  if (request.method === "GET" && pathname === "/api/backoffice") {
    if (!isPlatformAdmin(user, account)) {
      sendJson(response, 403, { message: "Back office access is restricted to platform admins" });
      return;
    }
    sendJson(response, 200, buildBackOffice(data));
    return;
  }

  if (request.method === "POST" && pathname === "/api/backoffice/refund") {
    if (!isPlatformAdmin(user, account)) {
      sendJson(response, 403, { message: "Refund access is restricted to platform admins" });
      return;
    }
    const body = await readBody(request);
    const businessId = body.businessId || body.storeId;
    const targetStore = data.stores.find((store) => store.id === businessId);
    if (!targetStore) {
      sendJson(response, 400, { message: "Unknown customer business" });
      return;
    }
    const amount = roundMoney(body.amount);
    if (amount <= 0) {
      sendJson(response, 400, { message: "Refund amount must be greater than zero" });
      return;
    }
    data.refunds ||= [];
    data.records[businessId] ||= seedStoreRecords(businessId, targetStore);
    const targetRecords = data.records[businessId];
    targetRecords.billing ||= seedBillingProfile(businessId);
    targetRecords.billing.paymentHistory ||= [];
    const refund = {
      id: `refund-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      businessId,
      customerId: body.customerId || "",
      businessName: targetStore.name,
      amount,
      action: body.action || "Refund",
      reason: body.reason || "Customer fee adjustment",
      status: "Recorded",
      createdBy: user.name,
      createdAt: new Date().toISOString(),
    };
    data.refunds.unshift(refund);
    if (refund.action === "Account credit") {
      targetRecords.billing.referral ||= {};
      targetRecords.billing.referral.credits = roundMoney((Number(targetRecords.billing.referral.credits) || 0) + amount);
    }
    targetRecords.billing.paymentHistory.unshift({
      id: `pay-${Date.now()}`,
      date: refund.createdAt,
      description: `${refund.action}: ${refund.reason}`,
      amount: -amount,
      status: refund.status,
      invoiceNumber: `RF-${Date.now()}`,
    });
    writeData(data);
    sendJson(response, 200, buildBackOffice(data));
    return;
  }

  if (request.method === "POST" && pathname === "/api/customer-portal/profile") {
    const body = await readBody(request);
    records.customerPortal ||= seedCustomerPortal(activeStore);
    records.customerPortal.profile = {
      ...records.customerPortal.profile,
      businessName: body.businessName || records.customerPortal.profile.businessName,
      ownerName: body.ownerName || records.customerPortal.profile.ownerName,
      businessEmail: body.businessEmail || records.customerPortal.profile.businessEmail,
      mobile: body.mobile || records.customerPortal.profile.mobile,
      country: body.country || records.customerPortal.profile.country,
      currency: body.currency || records.customerPortal.profile.currency,
      language: body.language || records.customerPortal.profile.language,
      timeZone: body.timeZone || records.customerPortal.profile.timeZone,
      storeType: body.storeType || records.customerPortal.profile.storeType,
      numberOfStores: Number(body.numberOfStores || records.customerPortal.profile.numberOfStores || 1),
      address: body.address || records.customerPortal.profile.address,
      vatGstNumber: body.vatGstNumber || records.customerPortal.profile.vatGstNumber,
      companyRegistrationNumber: body.companyRegistrationNumber || records.customerPortal.profile.companyRegistrationNumber,
    };
    Object.assign(activeStore, {
      name: records.customerPortal.profile.businessName,
      businessEmail: records.customerPortal.profile.businessEmail,
      mobile: records.customerPortal.profile.mobile,
      country: records.customerPortal.profile.country,
      currency: records.customerPortal.profile.currency,
      language: records.customerPortal.profile.language,
      timeZone: records.customerPortal.profile.timeZone,
      storeType: records.customerPortal.profile.storeType,
      address: records.customerPortal.profile.address,
      vatGstNumber: records.customerPortal.profile.vatGstNumber,
      companyRegistrationNumber: records.customerPortal.profile.companyRegistrationNumber,
    });
    writeData(data);
    sendJson(response, 200, storePayload(data, userStoreId));
    return;
  }

  if (request.method === "POST" && pathname === "/api/team/invite") {
    const body = await readBody(request);
    if (!body.email || !body.role) {
      sendJson(response, 400, { message: "Email and role are required" });
      return;
    }
    const role = roleDefinitions.find((item) => item.id === body.role || item.name === body.role) || roleDefinitions.find((item) => item.id === "custom");
    const invite = {
      id: `invite-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      email: String(body.email).trim().toLowerCase(),
      name: body.name || "",
      role: role.name,
      permissions: role.permissions,
      status: "Invitation sent",
      invitedBy: user.name,
      invitedAt: new Date().toISOString(),
    };
    records.team ||= seedTeam(userStoreId);
    records.team.invites ||= [];
    records.team.invites.unshift(invite);
    writeData(data);
    sendJson(response, 200, storePayload(data, userStoreId));
    return;
  }

  if (request.method === "POST" && pathname.startsWith("/api/team/members/")) {
    const memberId = decodeURIComponent(pathname.replace("/api/team/members/", ""));
    const body = await readBody(request);
    records.team ||= seedTeam(userStoreId);
    records.team.members ||= [];
    const member = records.team.members.find((item) => item.id === memberId);
    if (!member) {
      sendJson(response, 404, { message: "Team member not found" });
      return;
    }
    const role = roleDefinitions.find((item) => item.id === body.role || item.name === body.role) || roleDefinitions.find((item) => item.id === "custom");
    member.name = String(body.name || member.name).trim();
    member.email = String(body.email || member.email).trim().toLowerCase();
    member.role = role?.name || body.role || member.role;
    member.status = body.status || member.status || "Active";
    member.permissions = role?.permissions || member.permissions || [];

    const staffPerson = data.staff.find((person) => person.id === member.id && person.storeId === userStoreId);
    if (staffPerson) {
      staffPerson.name = member.name;
      staffPerson.role = member.role;
    }

    writeData(data);
    sendJson(response, 200, storePayload(data, userStoreId));
    return;
  }

  if (request.method === "POST" && pathname === "/api/security") {
    const body = await readBody(request);
    if (!account) {
      sendJson(response, 403, { message: "Security settings belong to customer accounts" });
      return;
    }
    account.security ||= seedAccountSecurity();
    if (typeof body.twoFactorEnabled === "boolean") account.security.twoFactorEnabled = body.twoFactorEnabled;
    if (typeof body.rememberDeviceEnabled === "boolean") account.security.rememberDeviceEnabled = body.rememberDeviceEnabled;
    if (typeof body.loginAlerts === "boolean") account.security.loginAlerts = body.loginAlerts;
    writeData(data);
    sendJson(response, 200, {
      user: accountPrincipal(account),
      account: publicAccount(account),
      ...storePayload(data, userStoreId),
    });
    return;
  }

  if (request.method === "POST" && pathname === "/api/api-keys") {
    const body = await readBody(request);
    records.customerPortal ||= seedCustomerPortal(activeStore);
    records.customerPortal.apiKeys ||= [];
    records.customerPortal.apiKeys.unshift({
      id: `key-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      name: body.name || "New API key",
      prefix: "sp_live_",
      status: "Active",
      createdAt: new Date().toISOString(),
      lastUsedAt: "",
    });
    writeData(data);
    sendJson(response, 200, storePayload(data, userStoreId));
    return;
  }

  if (request.method === "POST" && pathname === "/api/support-tickets") {
    const body = await readBody(request);
    records.customerPortal ||= seedCustomerPortal(activeStore);
    records.customerPortal.supportTickets ||= [];
    records.customerPortal.supportTickets.unshift({
      id: `sup-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      subject: body.subject || "Support request",
      status: "Open",
      priority: body.priority || "Normal",
      updatedAt: new Date().toISOString(),
    });
    writeData(data);
    sendJson(response, 200, storePayload(data, userStoreId));
    return;
  }

  if (request.method === "POST" && pathname === "/api/temperature/daily") {
    const body = await readBody(request);
    const logDate = body.date || dateParts().date;
    const month = logDate.slice(0, 7);
    const entries = Array.isArray(body.entries) ? body.entries : [];
    records.temperatures ||= [];

    entries.forEach((entry) => {
      const unit = entry.unit || entry.location;
      if (!unit) return;
      const existing = records.temperatures.find((item) => item.date === logDate && (item.unit || item.location) === unit);
      const next = withEntryMeta(
        {
          ...(existing || {}),
          date: logDate,
          month,
          unit,
          location: unit,
          temp: normalizeTemperature(entry.temp),
          status: entry.status || "In Range",
          notes: entry.notes || "",
        },
        "temperature",
        user.name,
        logDate
      );
      next.time = currentTime();
      next.staff = user.name;
      if (existing) {
        const before = { temp: existing.temp, notes: existing.notes, status: existing.status };
        const reason = body.editReason || entry.editReason || "Temperature edited after submission";
        existing.auditTrail ||= [];
        existing.auditTrail.unshift({ ...dateParts(), staff: user.name, reason, before, after: { temp: next.temp, notes: next.notes, status: next.status } });
        Object.assign(existing, next, { editedAt: new Date().toISOString(), editedBy: user.name, editReason: reason });
        audit(records, "Edited", "temperature", existing.id, user, reason, before, { temp: existing.temp, notes: existing.notes, status: existing.status });
      } else {
        records.temperatures.unshift(next);
      }
    });

    writeData(data);
    sendJson(response, 200, storePayload(data, userStoreId));
    return;
  }

  if (request.method === "POST" && pathname.startsWith("/api/logs/edit/")) {
    const entryId = decodeURIComponent(pathname.replace("/api/logs/edit/", ""));
    const body = await readBody(request);
    const collections = ["temperatures", "visitors", "ageChecks", "postOfficeLogs", "payouts", "deliveries"];
    let found = null;
    let collectionName = "";
    collections.some((collection) => {
      const entry = (records[collection] || []).find((item) => item.id === entryId);
      if (entry) {
        found = entry;
        collectionName = collection;
        return true;
      }
      return false;
    });
    if (!found) {
      sendJson(response, 404, { message: "Entry not found" });
      return;
    }
    const before = { ...found };
    const reason = body.editReason || body.reason || "Edited after submission";
    Object.assign(found, body.patch || {});
    found.temp = found.temp !== undefined ? normalizeTemperature(found.temp) : found.temp;
    found.editedAt = new Date().toISOString();
    found.editedBy = user.name;
    found.editReason = reason;
    found.auditTrail ||= [];
    found.auditTrail.unshift({ ...dateParts(), staff: user.name, reason, before, after: { ...found } });
    audit(records, "Edited", found.entryType || collectionName, found.id, user, reason, before, { ...found });
    writeData(data);
    sendJson(response, 200, storePayload(data, userStoreId));
    return;
  }

  if (request.method === "GET" && pathname === "/api/reports/temperature-pdf") {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);
    const month = requestUrl.searchParams.get("month") || dateParts().month;
    const rows = (records.temperatures || [])
      .filter((entry) => entry.month === month)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    const lines = [
      `Store: ${activeStore.name}`,
      `Month: ${month}`,
      `Generated: ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })}`,
      "",
      "Date | Time | Unit | Temp | Staff | Notes",
      ...rows.map((entry) => `${entry.date} | ${entry.time} | ${entry.unit || entry.location} | ${entry.temp} deg C | ${entry.staff} | ${entry.notes || ""}`),
    ];
    sendPdf(response, `temperature-log-${month}.pdf`, createSimplePdf(`Temperature Log ${month}`, lines));
    return;
  }

  if (request.method === "POST" && pathname.startsWith("/api/logs/")) {
    const type = pathname.replace("/api/logs/", "");
    const body = await readBody(request);
    const parts = dateParts();

    if (type === "temperature") {
      records.temperatures.unshift({
        ...withEntryMeta({}, "temperature", user.name),
        time: parts.time,
        date: parts.date,
        month: parts.month,
        unit: body.location,
        location: body.location,
        temp: normalizeTemperature(body.temp),
        status: body.status,
        notes: body.notes || "",
      });
    } else if (type === "visitor") {
      records.visitors.unshift({
        ...withEntryMeta({}, "visitor", user.name),
        name: body.name || "Visitor",
        purpose: body.purpose,
        notes: body.notes || "",
      });
    } else if (type === "age") {
      records.ageChecks.unshift({
        ...withEntryMeta({}, "age", user.name),
        outcome: body.outcome,
        category: body.category,
        notes: body.notes || body.category,
      });
    } else if (type === "post") {
      records.postOfficeLogs.unshift({
        ...withEntryMeta({}, "post", user.name),
        duty: body.duty,
        status: body.status,
        notes: body.notes || "",
      });
    } else if (type === "payout") {
      records.payouts ||= [];
      records.payouts.unshift({
        ...withEntryMeta({}, "payout", user.name),
        amount: body.amount || "0",
        paidTo: body.paidTo || "",
        reason: body.reason || "",
        notes: body.notes || "",
      });
    } else if (type === "delivery") {
      records.deliveries ||= [];
      records.deliveries.unshift({
        ...withEntryMeta({}, "delivery", user.name),
        supplier: body.supplier || body.name || "",
        reference: body.reference || "",
        documentName: body.documentName || "",
        documentNote: body.documentNote || "",
        notes: body.notes || "",
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

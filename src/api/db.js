// Local, browser-only data layer (localStorage). No server or account needed.
// Exposes: db.entities.<Name>.{filter,list,get,create,bulkCreate,update,bulkUpdate,delete,deleteMany},
//          db.auth.{me,getCurrentUser,register,login,logout,resetPassword}, db.files.upload

const PREFIX = "famnest:";

const DEFAULTS = {
  Bill: { amount: 0, frequency: "monthly", status: "upcoming" },
  Budget: { budgeted_amount: 0, period: "monthly" },
  Document: { type: "other" },
  Expense: { amount: 0, recurring: false },
  Family: { currency: "RWF", is_demo: false },
  FamilyEvent: { type: "other" },
  FamilyMember: { role: "member", can_view_finance: false },
  FamilyRequest: { estimated_cost: 0, status: "pending" },
  FinancialGoal: { target_amount: 0, current_amount: 0, priority: "medium" },
  Income: { amount: 0, frequency: "one_time" },
  Notification: { type: "event", read: false },
  Requirement: { estimated_cost: 0, priority: "medium", recurring: false, status: "open" },
  SavingsContribution: { amount: 0 },
  SavingsGoal: { target_amount: 0, current_amount: 0, category: "custom" },
  ShoppingItem: { estimated_price: 0, actual_price: 0, category: "groceries", purchased: false },
  Task: { priority: "medium", status: "todo", recurring: false },
};

const MAX_FILE_BYTES = 2 * 1024 * 1024;

function makeError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    throw makeError("Browser storage is full. Delete some data or documents and try again.", 507);
  }
}

function newId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/* ---------------------------------- auth ---------------------------------- */

async function hashPassword(password) {
  if (window.crypto?.subtle) {
    const bytes = new TextEncoder().encode("famnest|" + password);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback for non-secure contexts (plain http on a LAN address)
  let h = 5381;
  const s = "famnest|" + password;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return "weak-" + (h >>> 0).toString(16);
}

const publicUser = (u) => (u ? { id: u.id, email: u.email, full_name: u.full_name, role: u.role, created_date: u.created_date } : null);
const users = () => read("users", []);
const normEmail = (e) => String(e || "").trim().toLowerCase();

function currentUserSync() {
  const session = read("session", null);
  if (!session) return null;
  return publicUser(users().find((u) => u.id === session.userId));
}

const auth = {
  getCurrentUser: currentUserSync,

  async me() {
    const u = currentUserSync();
    if (!u) throw makeError("Not signed in", 401);
    return u;
  },

  async register({ email, password, full_name }) {
    const e = normEmail(email);
    if (!e || !password) throw makeError("Email and password are required", 400);
    if (password.length < 6) throw makeError("Password must be at least 6 characters", 400);
    const list = users();
    if (list.some((u) => u.email === e)) throw makeError("An account with this email already exists", 409);
    const user = {
      id: newId(),
      email: e,
      full_name: (full_name || "").trim() || e.split("@")[0],
      role: list.length === 0 ? "admin" : "user",
      password_hash: await hashPassword(password),
      created_date: new Date().toISOString(),
    };
    write("users", [...list, user]);
    write("session", { userId: user.id });
    return publicUser(user);
  },

  async login(email, password) {
    const user = users().find((u) => u.email === normEmail(email));
    if (!user || user.password_hash !== (await hashPassword(password))) {
      throw makeError("Invalid email or password", 401);
    }
    write("session", { userId: user.id });
    return publicUser(user);
  },

  async logout() {
    try { window.localStorage.removeItem(PREFIX + "session"); } catch { /* ignore */ }
  },

  // No email service exists, so a reset is done directly on this device.
  async resetPassword({ email, newPassword }) {
    if (!newPassword || newPassword.length < 6) throw makeError("Password must be at least 6 characters", 400);
    const list = users();
    const idx = list.findIndex((u) => u.email === normEmail(email));
    if (idx === -1) throw makeError("No account found with this email on this device", 404);
    list[idx] = { ...list[idx], password_hash: await hashPassword(newPassword) };
    write("users", list);
  },
};

/* -------------------------------- entities -------------------------------- */

function matches(record, query) {
  if (!query) return true;
  return Object.entries(query).every(([field, cond]) => {
    const v = record[field];
    if (cond && typeof cond === "object" && !Array.isArray(cond)) {
      return Object.entries(cond).every(([op, arg]) => {
        switch (op) {
          case "$ne": return v !== arg;
          case "$in": return Array.isArray(arg) && arg.includes(v);
          case "$nin": return Array.isArray(arg) && !arg.includes(v);
          case "$gt": return v > arg;
          case "$gte": return v >= arg;
          case "$lt": return v < arg;
          case "$lte": return v <= arg;
          default: return false;
        }
      });
    }
    return v === cond;
  });
}

function sortRecords(list, sort) {
  if (!sort) return list;
  const desc = sort.startsWith("-");
  const field = desc ? sort.slice(1) : sort;
  return [...list].sort((a, b) => {
    const x = a[field], y = b[field];
    if (x === y) return 0;
    if (x === undefined || x === null) return 1;
    if (y === undefined || y === null) return -1;
    return (x > y ? 1 : -1) * (desc ? -1 : 1);
  });
}

function makeEntity(name) {
  const key = "entity:" + name;
  const all = () => read(key, []);

  const build = (data) => {
    const now = new Date().toISOString();
    const user = currentUserSync();
    return {
      ...(DEFAULTS[name] || {}),
      ...data,
      id: newId(),
      created_date: now,
      updated_date: now,
      created_by: user?.email || null,
      created_by_id: user?.id || null,
    };
  };

  return {
    async filter(query, sort, limit) {
      let rows = sortRecords(all().filter((r) => matches(r, query)), sort);
      if (limit) rows = rows.slice(0, limit);
      return rows;
    },
    async list(sort, limit) {
      let rows = sortRecords(all(), sort);
      if (limit) rows = rows.slice(0, limit);
      return rows;
    },
    async get(id) {
      const row = all().find((r) => r.id === id);
      if (!row) throw makeError(`${name} not found`, 404);
      return row;
    },
    async create(data) {
      const row = build(data);
      write(key, [...all(), row]);
      return row;
    },
    async bulkCreate(items) {
      const rows = (items || []).map(build);
      write(key, [...all(), ...rows]);
      return rows;
    },
    async update(id, patch) {
      const rows = all();
      const idx = rows.findIndex((r) => r.id === id);
      if (idx === -1) throw makeError(`${name} not found`, 404);
      rows[idx] = { ...rows[idx], ...patch, id, updated_date: new Date().toISOString() };
      write(key, rows);
      return rows[idx];
    },
    async bulkUpdate(items) {
      const rows = all();
      const now = new Date().toISOString();
      const updated = [];
      for (const { id, ...patch } of items || []) {
        const idx = rows.findIndex((r) => r.id === id);
        if (idx === -1) continue;
        rows[idx] = { ...rows[idx], ...patch, id, updated_date: now };
        updated.push(rows[idx]);
      }
      write(key, rows);
      return updated;
    },
    async delete(id) {
      write(key, all().filter((r) => r.id !== id));
      return { success: true };
    },
    async deleteMany(query) {
      const rows = all();
      const kept = rows.filter((r) => !matches(r, query));
      write(key, kept);
      return { deleted: rows.length - kept.length };
    },
  };
}

const entityCache = {};
const entities = new Proxy({}, {
  get(_, name) {
    if (typeof name !== "string") return undefined;
    if (!entityCache[name]) entityCache[name] = makeEntity(name);
    return entityCache[name];
  },
});

/* ---------------------------------- files --------------------------------- */

const files = {
  // Stores the file inside the browser as a data URL (max 2 MB).
  async upload(file) {
    if (file.size > MAX_FILE_BYTES) throw makeError("File is too large (maximum 2 MB).", 413);
    const file_url = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(makeError("Could not read the file.", 400));
      reader.readAsDataURL(file);
    });
    return { file_url };
  },
};

export const db = { entities, auth, files };

const url = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const SESSION_KEY = "famnest:supabase-session";

export const supabaseConfigured = Boolean(url && apiKey && !url.includes("YOUR_PROJECT_REF"));

const readSession = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const access_token = hash.get("access_token");
    if (!access_token) return saved;
    const session = {
      access_token,
      refresh_token: hash.get("refresh_token"),
      expires_in: Number(hash.get("expires_in") || 3600),
      user: null,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    history.replaceState(null, "", `${location.pathname}${location.search}`);
    return session;
  } catch { return null; }
};
const writeSession = (value) => {
  if (value) localStorage.setItem(SESSION_KEY, JSON.stringify(value));
  else localStorage.removeItem(SESSION_KEY);
};
const toUser = (user) => user ? {
  id: user.id,
  email: user.email,
  full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0],
  picture: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
  role: user.user_metadata?.role || "admin",
  created_date: user.created_at,
} : null;

async function authRequest(path, body, token) {
  const response = await fetch(`${url}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: apiKey, "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.msg || result.message || result.error_description || result.error || "Supabase authentication failed");
  return result;
}

export async function supabaseSession() {
  let session = readSession();
  if (!session?.access_token) return null;
  if (!session.user) {
    try {
      const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: apiKey, Authorization: `Bearer ${session.access_token}` } });
      if (!response.ok) { writeSession(null); return null; }
      session = { ...session, user: await response.json() };
      writeSession(session);
    } catch { return null; }
  }
  if (session.expires_at && Date.now() > session.expires_at - 60_000) {
    if (!session.refresh_token) { writeSession(null); return null; }
    try {
      const next = await authRequest("token?grant_type=refresh_token", { refresh_token: session.refresh_token });
      session = { ...next, expires_at: Date.now() + (next.expires_in || 3600) * 1000 };
      writeSession(session);
    } catch {
      writeSession(null);
      return null;
    }
  }
  return session;
}

export function cachedSupabaseUser() { return toUser(readSession()?.user); }
export function setSupabaseSession(session) {
  if (session?.access_token) {
    writeSession({ ...session, expires_at: Date.now() + (session.expires_in || 3600) * 1000 });
  }
  return toUser(session?.user);
}
export function clearSupabaseSession() { writeSession(null); }

export async function supabaseAuth(path, body) {
  const result = await authRequest(path, body);
  const user = result.user || result;
  if (result.access_token) setSupabaseSession(result);
  return { user: toUser(user), session: result.access_token ? readSession() : null };
}

export async function requestPasswordReset(email, newPassword) {
  const session = await supabaseSession();
  if (!session) {
    const response = await fetch(`${url}/auth/v1/recover`, {
      method: "POST",
      headers: { apikey: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, redirect_to: `${location.origin}/forgot-password` }),
    });
    if (!response.ok) throw new Error("Could not send the password reset email.");
    return { recoverySent: true };
  }
  const response = await fetch(`${url}/auth/v1/user`, {
    method: "PUT",
    headers: { apikey: apiKey, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ password: newPassword }),
  });
  if (!response.ok) throw new Error("Could not update the password. Request a new reset link and try again.");
  return { passwordUpdated: true };
}

export async function supabaseData(table, query = "", { method = "GET", body, prefer = "return=representation" } = {}) {
  const session = await supabaseSession();
  if (!session) throw new Error("Your session expired. Please sign in again.");
  const response = await fetch(`${url}/rest/v1/${table}${query ? `?${query}` : ""}`, {
    method,
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      Prefer: prefer,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.message || result.msg || `Supabase request failed (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
}

export const currentSupabaseUserId = () => cachedSupabaseUser()?.id;
export const reminderSettingsUpsert = async (user) => {
  if (!user?.id || !user?.email) return;
  await supabaseData("bill_reminder_settings", "on_conflict=user_id", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: { user_id: user.id, recipient_email: user.email, enabled: true, timezone: "Africa/Cairo" },
  });
};

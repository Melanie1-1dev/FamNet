const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#39;");

function dateInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function hourInZone(date: Date, timeZone: string) {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(date));
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function query(path: string, key: string, init: RequestInit = {}) {
  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!response.ok) throw new Error(`Supabase returned ${response.status}: ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return Response.json({ error: "POST required" }, { status: 405 });
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  let secretKeys: Record<string, string> = {};
  try { secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}"); } catch { /* legacy projects may not expose the new key set */ }
  const allowedCronKey = secretKeys.default || serviceKey;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("REMINDER_FROM_EMAIL");
  if (!serviceKey || !resendKey || !from) return Response.json({ error: "Missing server secrets" }, { status: 500 });
  const suppliedApiKey = request.headers.get("apikey");
  const suppliedLegacyBearer = request.headers.get("authorization");
  if (suppliedApiKey !== allowedCronKey && suppliedLegacyBearer !== `Bearer ${serviceKey}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await query("bill_reminder_settings?select=user_id,recipient_email,timezone&enabled=eq.true", serviceKey) as Array<{user_id:string;recipient_email:string;timezone:string}>;
    let sent = 0;
    for (const setting of settings) {
      const now = new Date();
      const timezone = setting.timezone || "Africa/Cairo";
      if (hourInZone(now, timezone) < 9) continue;
      const today = dateInZone(now, timezone);
      const lastDay = addDays(today, 3);
      const prior = await query(`bill_reminder_deliveries?select=user_id&user_id=eq.${encodeURIComponent(setting.user_id)}&reminder_date=eq.${today}`, serviceKey) as unknown[];
      if (prior.length) continue;
      const bills = await query(`bills?select=name,amount,currency,due_date,category&user_id=eq.${encodeURIComponent(setting.user_id)}&status=neq.paid&due_date=gte.${today}&due_date=lte.${lastDay}&order=due_date.asc`, serviceKey) as Array<{name:string;amount:number;currency:string;due_date:string;category?:string}>;
      if (!bills.length) continue;

      const items = bills.map((bill) => {
        const amount = new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(Number(bill.amount));
        return `<li><strong>${escapeHtml(bill.name)}</strong> — ${escapeHtml(amount)} ${escapeHtml(bill.currency)}; due ${escapeHtml(bill.due_date)}${bill.category ? ` (${escapeHtml(bill.category)})` : ""}</li>`;
      }).join("");
      const email = await fetch("https://api.resend.com/emails", {
        method: "POST", headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [setting.recipient_email], subject: `FamNest: ${bills.length} bill${bills.length === 1 ? "" : "s"} due within 3 days`, html: `<h1>Upcoming bills</h1><p>Unpaid bills due ${escapeHtml(today)} through ${escapeHtml(lastDay)}:</p><ul>${items}</ul><p>Sent by FamNest.</p>` }),
      });
      if (!email.ok) throw new Error(`Email provider returned ${email.status}: ${await email.text()}`);
      await query("bill_reminder_deliveries", serviceKey, {
        method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify({ user_id: setting.user_id, reminder_date: today }),
      });
      sent += 1;
    }
    return Response.json({ ok: true, sent });
  } catch (error) {
    console.error("Daily bill reminders failed", error);
    return Response.json({ error: "Reminder run failed" }, { status: 500 });
  }
});

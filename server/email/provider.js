/** Email adapters. The mock records intent only and never claims delivery. */
export function createMockEmailProvider() {
  return {
    mode: "mock",
    async send({ to, subject }) {
      console.info(`[email mock] Would send ${JSON.stringify(subject)} to ${JSON.stringify(to)}; no email was sent.`);
      return { status: "mocked", delivered: false };
    },
  };
}

export function createResendEmailProvider({ apiKey, from }) {
  return {
    mode: "resend",
    async send({ to, subject, text }) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, subject, text }),
      });
      if (!response.ok) throw new Error(`Resend request failed (${response.status}).`);
      const result = await response.json();
      return { status: "accepted", delivered: false, providerId: result.id };
    },
  };
}

export function configuredEmailProvider(env = process.env) {
  if (env.NODE_ENV === "production" && env.EMAIL_PROVIDER !== "resend") {
    throw new Error("Production requires EMAIL_PROVIDER=resend; mock email is disabled.");
  }
  if (env.EMAIL_PROVIDER === "resend") {
    if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) throw new Error("Resend requires RESEND_API_KEY and RESEND_FROM_EMAIL.");
    return createResendEmailProvider({ apiKey: env.RESEND_API_KEY, from: env.RESEND_FROM_EMAIL });
  }
  return createMockEmailProvider();
}

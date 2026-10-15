import { createServer } from "node:http";
import { configuredEmailProvider } from "./email/provider.js";
import { MemoryAppointmentRepository, PostgresAppointmentRepository } from "./repositories/appointments.js";

const port = Number(process.env.API_PORT || 3001);
const mode = process.env.APP_DATA_MODE || (process.env.NODE_ENV === "production" ? "postgres" : "memory");
let repository;
if (mode === "postgres") {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required when APP_DATA_MODE=postgres.");
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined });
  repository = new PostgresAppointmentRepository(pool);
} else if (mode === "memory" && process.env.NODE_ENV !== "production") {
  repository = new MemoryAppointmentRepository();
} else {
  throw new Error("APP_DATA_MODE must be postgres in production; memory is development-only.");
}
const emailProvider = configuredEmailProvider();

const server = createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Access-Control-Allow-Origin", process.env.APP_ORIGIN || "http://localhost:5173");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (request.method === "OPTIONS") { response.writeHead(204).end(); return; }
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (request.method === "GET" && url.pathname === "/api/health") {
      response.writeHead(200).end(JSON.stringify({ ok: true, dataMode: mode, emailMode: emailProvider.mode })); return;
    }
    if (request.method === "GET" && url.pathname === "/api/appointments") {
      const familyId = url.searchParams.get("family_id");
      if (!familyId) { response.writeHead(400).end(JSON.stringify({ error: "family_id is required" })); return; }
      response.writeHead(200).end(JSON.stringify(await repository.list(familyId))); return;
    }
    if (request.method === "POST" && url.pathname === "/api/appointments") {
      let raw = "";
      for await (const chunk of request) raw += chunk;
      const input = JSON.parse(raw);
      if (!input.family_id || !input.title || !input.scheduled_at || !input.recipient_email) {
        response.writeHead(400).end(JSON.stringify({ error: "family_id, title, scheduled_at, and recipient_email are required" })); return;
      }
      const appointment = await repository.create(input);
      let email;
      try {
        email = await emailProvider.send({
          to: appointment.recipient_email,
          subject: `Appointment: ${appointment.title}`,
          text: `Appointment scheduled for ${appointment.scheduled_at}${appointment.description ? `\n\n${appointment.description}` : ""}`,
        });
        await repository.setEmailStatus(appointment.id, email.status);
      } catch (error) {
        await repository.setEmailStatus(appointment.id, "failed");
        throw error;
      }
      appointment.email_status = email.status;
      response.writeHead(201).end(JSON.stringify({ appointment, email })); return;
    }
    response.writeHead(404).end(JSON.stringify({ error: "Not found" }));
  } catch (error) {
    console.error("API request failed", error);
    response.writeHead(500).end(JSON.stringify({ error: "Request failed" }));
  }
});

server.listen(port, () => console.info(`FamNest2 API on http://localhost:${port} (${mode}, ${emailProvider.mode} email)`));

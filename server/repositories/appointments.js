import { randomUUID } from "node:crypto";

export class MemoryAppointmentRepository {
  rows = [];
  async create(input) {
    const now = new Date().toISOString();
    const row = { id: randomUUID(), ...input, created_at: now, updated_at: now };
    this.rows.push(row);
    return row;
  }
  async list(familyId) { return this.rows.filter((row) => row.family_id === familyId); }
  async setEmailStatus(id, status) {
    const row = this.rows.find((item) => item.id === id);
    if (row) row.email_status = status;
  }
}

export class PostgresAppointmentRepository {
  constructor(pool) { this.pool = pool; }
  async create(input) {
    const { rows } = await this.pool.query(
      `INSERT INTO appointments (family_id, title, description, scheduled_at, recipient_email, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [input.family_id, input.title, input.description || null, input.scheduled_at, input.recipient_email, input.created_by || null],
    );
    return rows[0];
  }
  async list(familyId) {
    const { rows } = await this.pool.query("SELECT * FROM appointments WHERE family_id = $1 ORDER BY scheduled_at", [familyId]);
    return rows;
  }
  async setEmailStatus(id, status) {
    await this.pool.query("UPDATE appointments SET email_status = $2, updated_at = now() WHERE id = $1", [id, status]);
  }
}

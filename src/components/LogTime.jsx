import { useState } from "react";
import { Plus, Timer, Pencil } from "lucide-react";
import { db } from "../lib/db";
import { SectionHeader, Button, Field, Chip, Modal, EmptyState, fmtDate, fmtHours, todayISO } from "./ui";

export default function LogTime({ entries, clients, tasks, currentEmployee, reload }) {
  const [form, setForm] = useState({ client_id: clients[0]?.id || "", task_id: "", date: todayISO(), minutes: 60, description: "", billable: true });
  const [editing, setEditing] = useState(null);

  if (!currentEmployee) {
    return (
      <div>
        <SectionHeader title="Log Time" />
        <EmptyState icon={Timer} text="Your login isn't linked to an employee record yet. Ask an admin to set this up in the Employees tab (or Supabase table editor)." />
      </div>
    );
  }

  const clientTasks = tasks.filter((t) => t.client_id === form.client_id);
  const mine = entries.filter((e) => e.employee_id === currentEmployee.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);

  async function submit() {
    if (!form.client_id) return;
    await db.timeEntries.insert({
      employee_id: currentEmployee.id,
      client_id: form.client_id,
      task_id: form.task_id || null,
      date: form.date,
      minutes: Number(form.minutes) || 0,
      description: form.description,
      billable: form.billable,
      billed: false,
    });
    setForm({ ...form, description: "", minutes: 60, task_id: "" });
    reload();
  }
  async function saveEdit(updated) {
    await db.timeEntries.update(updated.id, updated);
    setEditing(null);
    reload();
  }
  async function removeEntry(id) {
    await db.timeEntries.remove(id);
    setEditing(null);
    reload();
  }

  return (
    <div>
      <SectionHeader title="Log Time" subtitle={`Logging as ${currentEmployee.name} — feeds straight into Time & Billing`} />

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Client">
            <select className="input" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value, task_id: "" })}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Date">
            <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Minutes">
            <input type="number" min="0" className="input" style={{ width: 90 }} value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} />
          </Field>
        </div>
        <Field label="Related task (optional)">
          <select className="input" value={form.task_id} onChange={(e) => setForm({ ...form, task_id: e.target.value })}>
            <option value="">None</option>
            {clientTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </Field>
        <Field label="What did you work on?">
          <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={form.billable} onChange={(e) => setForm({ ...form, billable: e.target.checked })} /> Billable
          </label>
          <Button onClick={submit}><Plus size={14} /> Log time</Button>
        </div>
      </div>

      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--ledger-dark)", marginBottom: 10 }}>Your recent entries</h3>
      {mine.length === 0 ? (
        <div style={{ fontSize: 13, color: "#8a8368" }}>Nothing logged yet.</div>
      ) : (
        mine.map((e) => (
          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 8px", borderBottom: "1px solid var(--line)", fontSize: 13.5 }}>
            <div className="mono" style={{ fontSize: 12.5, color: "#3d5a78", width: 90 }}>{fmtDate(e.date)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div>{clients.find((c) => c.id === e.client_id)?.name || "—"}</div>
              {e.description && <div style={{ fontSize: 12, color: "#6b84a0" }}>{e.description}</div>}
            </div>
            <div className="mono" style={{ fontSize: 12.5 }}>{fmtHours(e.minutes)}h</div>
            {!e.billable && <Chip text="Non-billable" tone="neutral" />}
            {e.billed && <Chip text="Billed" tone="done" />}
            <button onClick={() => setEditing(e)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ledger)" }}>
              <Pencil size={14} />
            </button>
          </div>
        ))
      )}

      {editing && <EntryModal entry={editing} clients={clients} tasks={tasks} onSave={saveEdit} onDelete={removeEntry} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EntryModal({ entry, clients, tasks, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(entry);
  const clientTasks = tasks.filter((t) => t.client_id === form.client_id);
  return (
    <Modal title="Edit time entry" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Client">
            <select className="input" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value, task_id: "" })}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Date">
            <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
        </div>
        <Field label="Related task">
          <select className="input" value={form.task_id || ""} onChange={(e) => setForm({ ...form, task_id: e.target.value })}>
            <option value="">None</option>
            {clientTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </Field>
        <Field label="Description">
          <input className="input" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <Field label="Minutes">
          <input type="number" min="0" className="input" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) || 0 })} />
        </Field>
        <div style={{ display: "flex", gap: 18 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={form.billable} onChange={(e) => setForm({ ...form, billable: e.target.checked })} /> Billable
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={form.billed} onChange={(e) => setForm({ ...form, billed: e.target.checked })} /> Billed
          </label>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <Button variant="danger" onClick={() => onDelete(entry.id)}>Remove</Button>
          <Button onClick={() => onSave(form)}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

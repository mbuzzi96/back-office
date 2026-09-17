import { useState } from "react";
import { Plus, CheckSquare, Pencil } from "lucide-react";
import { db } from "../lib/db";
import { SectionHeader, Button, Chip, Field, Modal, EmptyState, fmtDate } from "./ui";

const CATEGORIES = ["Tax", "Bookkeeping", "Payroll", "Advisory", "Other"];
const TASK_STATUSES = ["To do", "In progress", "Waiting on client", "Done"];
const PRIORITIES = ["Low", "Medium", "High"];

export default function Tasks({ tasks, clients, employees, currentEmployee, reload }) {
  const [modal, setModal] = useState(null);
  const [filterClient, setFilterClient] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");

  const employeeMap = {};
  employees.forEach((e) => (employeeMap[e.id] = e));

  const meId = currentEmployee?.id;
  const newForMe = meId
    ? tasks.filter((t) => t.assignee_id === meId && t.status !== "Done" && !(t.seen_by || []).includes(meId))
    : [];

  async function save(form) {
    if (form.id) {
      const original = tasks.find((t) => t.id === form.id);
      const reassigned = original && original.assignee_id !== form.assignee_id;
      await db.tasks.update(form.id, { ...form, seen_by: reassigned ? [] : form.seen_by || [] });
    } else {
      await db.tasks.insert({ ...form, seen_by: [] });
    }
    setModal(null);
    reload();
  }
  async function remove(id) {
    await db.tasks.remove(id);
    setModal(null);
    reload();
  }
  async function quickStatus(task, status) {
    await db.tasks.update(task.id, { status });
    reload();
  }
  async function openTask(t) {
    if (meId && t.assignee_id === meId && !(t.seen_by || []).includes(meId)) {
      await db.tasks.update(t.id, { seen_by: [...(t.seen_by || []), meId] });
      reload();
    }
    setModal(t);
  }

  const filtered = tasks
    .filter((t) => !filterClient || t.client_id === filterClient)
    .filter((t) => !filterStatus || t.status === filterStatus)
    .filter((t) => !filterAssignee || (filterAssignee === "__unassigned" ? !t.assignee_id : t.assignee_id === filterAssignee))
    .sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"));

  return (
    <div>
      <SectionHeader
        title="Tasks"
        subtitle={`${tasks.filter((t) => t.status !== "Done").length} open`}
        action={<Button onClick={() => setModal("new")}><Plus size={14} /> Add task</Button>}
      />

      {newForMe.length > 0 && (
        <div style={{ background: "var(--sage)", border: "1px solid var(--ledger)", color: "var(--ledger-dark)", borderRadius: 6, padding: "10px 14px", marginBottom: 16, fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>You have {newForMe.length} new task{newForMe.length === 1 ? "" : "s"} assigned to you.</span>
          <Button size="sm" onClick={() => setFilterAssignee(meId)}>Show them</Button>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <select className="input" style={{ width: 160 }} value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
          <option value="">All clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input" style={{ width: 160 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="input" style={{ width: 160 }} value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
          <option value="">Everyone</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          <option value="__unassigned">Unassigned</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CheckSquare} text="No tasks match." actionLabel="Add task" onAction={() => setModal("new")} />
      ) : (
        filtered.map((t) => {
          const overdue = t.due_date && t.status !== "Done" && new Date(t.due_date) < new Date(new Date().toDateString());
          const isNew = meId && t.assignee_id === meId && !(t.seen_by || []).includes(meId);
          return (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 10px", borderBottom: "1px solid var(--line)", borderLeft: overdue ? "3px solid var(--rust)" : "3px solid transparent", background: "var(--paper-raised)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", gap: 8 }}>
                  {t.title}
                  {isNew && <Chip text="New" tone="gold" />}
                </div>
                <div style={{ fontSize: 12, color: "#6b84a0", marginTop: 2 }}>
                  {clients.find((c) => c.id === t.client_id)?.name || "No client"} · {t.category}
                  {t.assignee_id && ` · ${employeeMap[t.assignee_id]?.name || "Unknown"}`}
                </div>
              </div>
              <Chip text={t.priority} tone={t.priority === "High" ? "rust" : t.priority === "Medium" ? "gold" : "neutral"} />
              <div className="mono" style={{ fontSize: 12.5, color: overdue ? "var(--rust)" : "#3d5a78", width: 90 }}>{fmtDate(t.due_date)}</div>
              <select className="input" style={{ width: 150, padding: "5px 8px", fontSize: 12.5 }} value={t.status} onChange={(e) => quickStatus(t, e.target.value)}>
                {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <button onClick={() => openTask(t)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ledger)" }}>
                <Pencil size={14} />
              </button>
            </div>
          );
        })
      )}

      {modal && (
        <TaskModal task={modal === "new" ? null : modal} clients={clients} employees={employees} onSave={save} onDelete={remove} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

function TaskModal({ task, clients, employees, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(
    task || { title: "", client_id: "", assignee_id: "", category: "Tax", due_date: "", priority: "Medium", status: "To do", notes: "" }
  );
  return (
    <Modal title={task ? "Edit task" : "Add task"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Task">
          <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Client">
            <select className="input" value={form.client_id || ""} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
              <option value="">No client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Assigned to">
            <select className="input" value={form.assignee_id || ""} onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}>
              <option value="">Unassigned</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Category">
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Due date">
            <input type="date" className="input" value={form.due_date || ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Notes">
          <textarea className="input" style={{ minHeight: 60 }} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          {task ? <Button variant="danger" onClick={() => onDelete(task.id)}>Remove</Button> : <span />}
          <Button onClick={() => form.title.trim() && onSave(form)}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

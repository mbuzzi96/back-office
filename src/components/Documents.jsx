import { useState } from "react";
import { Plus, FileText, Link2, Pencil } from "lucide-react";
import { db } from "../lib/db";
import { SectionHeader, Button, Chip, Field, Modal, EmptyState, fmtDate, todayISO } from "./ui";

const DOC_STATUSES = ["Requested", "Received", "Reviewed"];

export default function Documents({ documents, clients, reload }) {
  const [modal, setModal] = useState(null);
  const [filterClient, setFilterClient] = useState("");

  async function save(form) {
    if (form.id) await db.documents.update(form.id, form);
    else await db.documents.insert({ ...form, requested_date: todayISO() });
    setModal(null);
    reload();
  }
  async function remove(id) {
    await db.documents.remove(id);
    setModal(null);
    reload();
  }

  const filtered = documents
    .filter((d) => !filterClient || d.client_id === filterClient)
    .sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"));

  return (
    <div>
      <SectionHeader
        title="Documents"
        subtitle={`${documents.filter((d) => d.status !== "Reviewed").length} open requests`}
        action={<Button onClick={() => setModal("new")}><Plus size={14} /> Request document</Button>}
      />
      <div style={{ marginBottom: 14 }}>
        <select className="input" style={{ width: 180 }} value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
          <option value="">All clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} text="No document requests yet." actionLabel="Request document" onAction={() => setModal("new")} />
      ) : (
        filtered.map((d) => (
          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 10px", borderBottom: "1px solid var(--line)", background: "var(--paper-raised)" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{d.name}</div>
              <div style={{ fontSize: 12, color: "#6b84a0", marginTop: 2 }}>
                {clients.find((c) => c.id === d.client_id)?.name || "No client"}{d.description ? ` · ${d.description}` : ""}
              </div>
              {d.link && (
                <a href={d.link} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--ledger)", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <Link2 size={12} /> {d.link}
                </a>
              )}
            </div>
            <div className="mono" style={{ fontSize: 12.5, color: "#3d5a78", width: 90 }}>{fmtDate(d.due_date)}</div>
            <Chip text={d.status} tone={d.status === "Reviewed" ? "done" : d.status === "Received" ? "gold" : "neutral"} />
            <button onClick={() => setModal(d)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ledger)" }}>
              <Pencil size={14} />
            </button>
          </div>
        ))
      )}

      {modal && <DocModal doc={modal === "new" ? null : modal} clients={clients} onSave={save} onDelete={remove} onClose={() => setModal(null)} />}
    </div>
  );
}

function DocModal({ doc, clients, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(doc || { client_id: clients[0]?.id || "", name: "", description: "", due_date: "", status: "Requested", link: "" });
  return (
    <Modal title={doc ? "Edit document request" : "Request document"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Client">
          <select className="input" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Document">
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
        </Field>
        <Field label="Note to client (optional)">
          <input className="input" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Due date">
            <input type="date" className="input" value={form.due_date || ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {DOC_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        {doc && (
          <Field label="Link">
            <input className="input" value={form.link || ""} onChange={(e) => setForm({ ...form, link: e.target.value })} />
          </Field>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          {doc ? <Button variant="danger" onClick={() => onDelete(doc.id)}>Remove</Button> : <span />}
          <Button onClick={() => form.name.trim() && form.client_id && onSave(form)}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

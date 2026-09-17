import { useState } from "react";
import { Plus, Search, Pencil, Trash2, Users } from "lucide-react";
import { db } from "../lib/db";
import { SectionHeader, Button, Chip, Field, Modal, EmptyState } from "./ui";

const CLIENT_STATUSES = ["Active", "Prospect", "Inactive"];
const PARTNERS = ["Michael Buzzi", "Julio Buzzi", "Jose Smith IV"];

export default function Clients({ clients, tasks, reload }) {
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState("");
  const [filterPartner, setFilterPartner] = useState("");

  const filtered = clients
    .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    .filter((c) => !filterPartner || (filterPartner === "unassigned" ? !c.partner : c.partner === filterPartner));

  async function save(form) {
    if (form.id) await db.clients.update(form.id, form);
    else await db.clients.insert(form);
    setModal(null);
    reload();
  }
  async function remove(id) {
    await db.clients.remove(id);
    setModal(null);
    reload();
  }

  const groupOrder = [...PARTNERS, "unassigned"];
  const groups = groupOrder
    .map((key) => ({
      key,
      label: key === "unassigned" ? "Unassigned" : key,
      items: filtered.filter((c) => (key === "unassigned" ? !c.partner : c.partner === key)),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div>
      <SectionHeader
        title="Clients"
        subtitle={`${clients.length} on file`}
        action={<Button onClick={() => setModal("new")}><Plus size={14} /> Add client</Button>}
      />
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Search size={14} color="#6b84a0" />
          <input className="input" style={{ width: 240 }} placeholder="Search clients…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="input" style={{ width: 180 }} value={filterPartner} onChange={(e) => setFilterPartner(e.target.value)}>
          <option value="">All partners</option>
          {PARTNERS.map((p) => <option key={p} value={p}>{p}</option>)}
          <option value="unassigned">Unassigned</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} text="No clients yet." actionLabel="Add client" onAction={() => setModal("new")} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {groups.map((g) => (
            <div key={g.key}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "var(--ledger-dark)", marginBottom: 8 }}>
                {g.label} <span className="mono" style={{ fontSize: 11.5, color: "#6b84a0", fontWeight: 500 }}>{g.items.length}</span>
              </div>
              <table className="data">
                <thead>
                  <tr>{["Name", "Type", "Status", "Contact", "Open tasks", ""].map((h) => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {g.items.map((c) => {
                    const openCount = tasks.filter((t) => t.client_id === c.id && t.status !== "Done").length;
                    return (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td>{c.entity_type || "—"}</td>
                        <td><Chip text={c.status} tone={c.status === "Active" ? "done" : c.status === "Prospect" ? "gold" : "neutral"} /></td>
                        <td>{c.email || c.phone || "—"}</td>
                        <td className="mono">{openCount}</td>
                        <td style={{ textAlign: "right" }}>
                          <button onClick={() => setModal(c)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ledger)" }}>
                            <Pencil size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {modal && <ClientModal client={modal === "new" ? null : modal} onSave={save} onDelete={remove} onClose={() => setModal(null)} />}
    </div>
  );
}

function ClientModal({ client, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(
    client || { name: "", entity_type: "", status: "Active", email: "", phone: "", notes: "", partner: "" }
  );
  return (
    <Modal title={client ? "Edit client" : "Add client"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Client name">
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Entity type">
            <input className="input" value={form.entity_type || ""} onChange={(e) => setForm({ ...form, entity_type: e.target.value })} />
          </Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {CLIENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Partner">
          <select className="input" value={form.partner || ""} onChange={(e) => setForm({ ...form, partner: e.target.value })}>
            <option value="">Unassigned</option>
            {PARTNERS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Email">
            <input className="input" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input className="input" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea className="input" style={{ minHeight: 70 }} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          {client ? <Button variant="danger" onClick={() => onDelete(client.id)}><Trash2 size={14} /> Remove</Button> : <span />}
          <Button onClick={() => form.name.trim() && onSave(form)}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

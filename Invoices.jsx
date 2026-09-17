import { useState } from "react";
import { Plus, Receipt, Printer, Pencil, X, Building2 } from "lucide-react";
import { db } from "../lib/db";
import { SectionHeader, Button, Chip, Field, Modal, EmptyState, fmtDate, money, todayISO } from "./ui";

const INVOICE_STATUSES = ["Draft", "Sent", "Paid"];

function nextInvoiceNumber(invoices) {
  return "INV-" + String(invoices.length + 1).padStart(4, "0");
}
function invoiceTotal(inv) {
  return (inv.line_items || []).reduce((s, li) => s + (Number(li.amount) || 0), 0);
}

export default function Invoices({ invoices, clients, entries, tasks, firmInfo, reload }) {
  const [modal, setModal] = useState(null);
  const [printing, setPrinting] = useState(null);
  const [firmModal, setFirmModal] = useState(false);
  const [filterClient, setFilterClient] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const clientMap = {};
  clients.forEach((c) => (clientMap[c.id] = c));

  async function syncLinkedEntries(prevLinked, nextLinked) {
    const added = nextLinked.filter((id) => !prevLinked.includes(id));
    const removed = prevLinked.filter((id) => !nextLinked.includes(id));
    await Promise.all([
      ...added.map((id) => db.timeEntries.update(id, { billed: true })),
      ...removed.map((id) => db.timeEntries.update(id, { billed: false })),
    ]);
  }

  async function save(form) {
    const original = modal !== "new" ? modal : null;
    await syncLinkedEntries(original?.linked_entry_ids || [], form.linked_entry_ids || []);
    if (form.id) await db.invoices.update(form.id, form);
    else await db.invoices.insert(form);
    setModal(null);
    reload();
  }
  async function remove(id) {
    const inv = invoices.find((i) => i.id === id);
    await syncLinkedEntries(inv?.linked_entry_ids || [], []);
    await db.invoices.remove(id);
    setModal(null);
    reload();
  }
  async function setStatus(inv, status) {
    const patch = status === "Paid" ? { status, paid_date: inv.paid_date || todayISO() } : { status };
    await db.invoices.update(inv.id, patch);
    reload();
  }
  async function setPaidDate(inv, paid_date) {
    await db.invoices.update(inv.id, { paid_date });
    reload();
  }

  const unbilledHoursTotal = entries.filter((e) => e.billable && !e.billed).reduce((s, e) => s + e.minutes / 60, 0);
  const openInvoices = invoices.filter((i) => i.status !== "Paid");
  const paidInvoices = invoices.filter((i) => i.status === "Paid");
  const openTotal = openInvoices.reduce((s, i) => s + invoiceTotal(i), 0);
  const paidTotal = paidInvoices.reduce((s, i) => s + invoiceTotal(i), 0);

  const summaryCards = [
    { key: "", label: "Unbilled hours (not yet invoiced)", value: unbilledHoursTotal.toFixed(2) },
    { key: "unpaid", label: `${openInvoices.length} open / unpaid invoice${openInvoices.length === 1 ? "" : "s"}`, value: money(openTotal) },
    { key: "paid", label: `${paidInvoices.length} paid invoice${paidInvoices.length === 1 ? "" : "s"}`, value: money(paidTotal) },
  ];

  const filtered = invoices
    .filter((i) => !filterClient || i.client_id === filterClient)
    .filter((i) => !filterStatus || (filterStatus === "paid" ? i.status === "Paid" : i.status !== "Paid"))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  if (printing) {
    return <InvoicePrintView invoice={printing} client={clientMap[printing.client_id]} firmInfo={firmInfo} onClose={() => setPrinting(null)} />;
  }

  return (
    <div>
      <SectionHeader
        title="Invoices"
        subtitle={`${invoices.length} created`}
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="ghost" onClick={() => setFirmModal(true)}><Building2 size={14} /> Letterhead</Button>
            <Button onClick={() => setModal("new")}><Plus size={14} /> New invoice</Button>
          </div>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {summaryCards.map((c) => (
          <button
            key={c.label}
            onClick={() => c.key && setFilterStatus(filterStatus === c.key ? "" : c.key)}
            className="card gold-top"
            style={{ textAlign: "left", cursor: c.key ? "pointer" : "default", border: filterStatus === c.key && c.key ? "1px solid var(--ledger)" : undefined }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--ledger-dark)" }}>{c.value}</div>
            <div style={{ fontSize: 12, color: "#6b84a0", marginTop: 4 }}>{c.label}</div>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <select className="input" style={{ width: 180 }} value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
          <option value="">All clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input" style={{ width: 160 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="unpaid">Open / unpaid</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Receipt} text="No invoices yet." actionLabel="New invoice" onAction={() => setModal("new")} />
      ) : (
        <table className="data">
          <thead><tr>{["Number", "Client", "Date", "Due", "Total", "Status", "Paid date", ""].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((inv) => (
              <tr key={inv.id}>
                <td className="mono">{inv.number}</td>
                <td style={{ fontWeight: 600 }}>{clientMap[inv.client_id]?.name || "—"}</td>
                <td className="mono">{fmtDate(inv.date)}</td>
                <td className="mono">{fmtDate(inv.due_date)}</td>
                <td className="mono" style={{ fontWeight: 600 }}>{money(invoiceTotal(inv))}</td>
                <td>
                  <select className="input" style={{ padding: "4px 8px", fontSize: 12 }} value={inv.status} onChange={(e) => setStatus(inv, e.target.value)}>
                    {INVOICE_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td>
                  {inv.status === "Paid" ? (
                    <input type="date" className="input" style={{ padding: "4px 8px", fontSize: 12, width: 140 }} value={inv.paid_date || ""} onChange={(e) => setPaidDate(inv, e.target.value)} />
                  ) : <span style={{ color: "#8a8368" }}>—</span>}
                </td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button onClick={() => setPrinting(inv)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ledger)", marginRight: 8 }}><Printer size={14} /></button>
                  <button onClick={() => setModal(inv)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ledger)" }}><Pencil size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <InvoiceModal invoice={modal === "new" ? null : modal} clients={clients} entries={entries} tasks={tasks} nextNumber={nextInvoiceNumber(invoices)} onSave={save} onDelete={remove} onClose={() => setModal(null)} />
      )}
      {firmModal && <FirmInfoModal firmInfo={firmInfo} onClose={() => setFirmModal(false)} onSaved={reload} />}
    </div>
  );
}

function InvoiceModal({ invoice, clients, entries, tasks, nextNumber, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(
    invoice || { client_id: clients[0]?.id || "", number: nextNumber, date: todayISO(), due_date: "", line_items: [], linked_entry_ids: [], notes: "Payment due upon receipt. Thank you for your business.", status: "Draft", paid_date: "" }
  );
  const linkedEntryIds = form.linked_entry_ids || [];

  const availableEntries = entries
    .filter((e) => e.client_id === form.client_id && e.billable && (!e.billed || linkedEntryIds.includes(e.id)))
    .sort((a, b) => a.date.localeCompare(b.date));
  const selectedHours = availableEntries.filter((e) => linkedEntryIds.includes(e.id)).reduce((s, e) => s + e.minutes / 60, 0);

  function toggleEntry(id) {
    setForm({ ...form, linked_entry_ids: linkedEntryIds.includes(id) ? linkedEntryIds.filter((x) => x !== id) : [...linkedEntryIds, id] });
  }
  function entryLabel(e) {
    const task = tasks?.find((t) => t.id === e.task_id);
    return e.description || task?.title || "Time entry";
  }
  function addSelectedToInvoice() {
    const existingIds = form.line_items.filter((li) => li.entryId).map((li) => li.entryId);
    const toAdd = availableEntries.filter((e) => linkedEntryIds.includes(e.id) && !existingIds.includes(e.id));
    if (toAdd.length === 0) return;
    const newLines = toAdd.map((e) => ({ id: crypto.randomUUID(), entryId: e.id, description: entryLabel(e), hours: (e.minutes / 60).toFixed(2), amount: "" }));
    setForm({ ...form, line_items: [...form.line_items, ...newLines] });
  }
  function updateLine(id, field, value) {
    setForm({ ...form, line_items: form.line_items.map((li) => (li.id === id ? { ...li, [field]: value } : li)) });
  }
  function addLine() {
    setForm({ ...form, line_items: [...form.line_items, { id: crypto.randomUUID(), description: "", hours: "", amount: "" }] });
  }
  function removeLine(id) {
    const li = form.line_items.find((l) => l.id === id);
    setForm({ ...form, line_items: form.line_items.filter((l) => l.id !== id), linked_entry_ids: li?.entryId ? linkedEntryIds.filter((eid) => eid !== li.entryId) : linkedEntryIds });
  }

  const total = form.line_items.reduce((s, li) => s + (Number(li.amount) || 0), 0);

  return (
    <Modal title={invoice ? "Edit invoice" : "New invoice"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Client">
            <select className="input" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Invoice #"><input className="input" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></Field>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Invoice date"><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Due date"><input type="date" className="input" value={form.due_date || ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Status">
            <select className="input" value={form.status} onChange={(e) => { const status = e.target.value; setForm({ ...form, status, paid_date: status === "Paid" ? form.paid_date || todayISO() : form.paid_date }); }}>
              {INVOICE_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          {form.status === "Paid" && (
            <Field label="Payment date"><input type="date" className="input" value={form.paid_date || ""} onChange={(e) => setForm({ ...form, paid_date: e.target.value })} /></Field>
          )}
        </div>

        {availableEntries.length > 0 && (
          <div style={{ border: "1px solid var(--line)", borderRadius: 6, padding: 10 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#5c5540", marginBottom: 6 }}>Pull in time entries — {selectedHours.toFixed(2)} hrs selected</div>
            <div style={{ maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              {availableEntries.map((e) => (
                <label key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "4px 6px", borderRadius: 4, background: linkedEntryIds.includes(e.id) ? "var(--sage)" : "transparent" }}>
                  <input type="checkbox" checked={linkedEntryIds.includes(e.id)} onChange={() => toggleEntry(e.id)} />
                  <span className="mono" style={{ color: "#3d5a78", width: 74 }}>{fmtDate(e.date)}</span>
                  <span style={{ flex: 1 }}>{entryLabel(e)}</span>
                  <span className="mono">{(e.minutes / 60).toFixed(2)}h</span>
                </label>
              ))}
            </div>
            <div style={{ marginTop: 8 }}><Button size="sm" onClick={addSelectedToInvoice}><Plus size={13} /> Add selected as line items</Button></div>
          </div>
        )}

        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#5c5540", marginBottom: 6 }}>Line items</div>
          {form.line_items.length === 0 && <div style={{ fontSize: 12.5, color: "#8a8368", marginBottom: 8 }}>No line items yet.</div>}
          {form.line_items.map((li) => (
            <div key={li.id} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input className="input" style={{ flex: 2 }} placeholder="Description" value={li.description} onChange={(e) => updateLine(li.id, "description", e.target.value)} />
              <input type="number" min="0" className="input" style={{ width: 80 }} placeholder="Hours" value={li.hours} onChange={(e) => updateLine(li.id, "hours", e.target.value)} />
              <input type="number" min="0" className="input" style={{ width: 100 }} placeholder="Amount" value={li.amount} onChange={(e) => updateLine(li.id, "amount", e.target.value)} />
              <button onClick={() => removeLine(li.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--rust)" }}><X size={15} /></button>
            </div>
          ))}
          <Button size="sm" variant="ghost" onClick={addLine}><Plus size={13} /> Add line</Button>
        </div>

        <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: "var(--ledger-dark)" }}>Total: {money(total)}</div>

        <Field label="Notes / payment instructions">
          <textarea className="input" style={{ minHeight: 60 }} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          {invoice ? <Button variant="danger" onClick={() => onDelete(invoice.id)}>Remove</Button> : <span />}
          <Button onClick={() => form.client_id && form.number.trim() && onSave(form)}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

function FirmInfoModal({ firmInfo, onClose, onSaved }) {
  const [form, setForm] = useState(firmInfo || { name: "", address_line1: "", address_line2: "", phone: "", email: "", website: "" });
  async function save() {
    await db.firmInfo.update(form);
    onSaved();
    onClose();
  }
  return (
    <Modal title="Letterhead details" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Firm name"><input className="input" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Address line 1"><input className="input" value={form.address_line1 || ""} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} /></Field>
        <Field label="Address line 2"><input className="input" value={form.address_line2 || ""} onChange={(e) => setForm({ ...form, address_line2: e.target.value })} /></Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Phone"><input className="input" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><input className="input" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        </div>
        <Field label="Website"><input className="input" value={form.website || ""} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
        <div style={{ display: "flex", justifyContent: "flex-end" }}><Button onClick={save}>Save</Button></div>
      </div>
    </Modal>
  );
}

function InvoicePrintView({ invoice, client, firmInfo, onClose }) {
  const total = invoiceTotal(invoice);
  return (
    <div>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
        <Button variant="ghost" onClick={onClose}><X size={14} /> Back to invoices</Button>
        <Button onClick={() => window.print()}><Printer size={14} /> Print / Save as PDF</Button>
      </div>
      <div className="invoice-print-area" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 6, padding: 40, maxWidth: 700, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "3px double var(--ledger-dark)", paddingBottom: 18, marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--ledger-dark)" }}>{firmInfo?.name || "Your Firm"}</div>
            {firmInfo?.address_line1 && <div style={{ fontSize: 12.5, color: "#5a7086", marginTop: 4 }}>{firmInfo.address_line1}</div>}
            {firmInfo?.address_line2 && <div style={{ fontSize: 12.5, color: "#5a7086" }}>{firmInfo.address_line2}</div>}
            <div style={{ fontSize: 12.5, color: "#5a7086", marginTop: 4 }}>{[firmInfo?.phone, firmInfo?.email, firmInfo?.website].filter(Boolean).join(" · ")}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "var(--ledger)", letterSpacing: 1 }}>INVOICE</div>
            <div className="mono" style={{ fontSize: 13, color: "#3d5a78", marginTop: 6 }}>{invoice.number}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", color: "#8a8368", marginBottom: 4 }}>Bill to</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{client?.name || "Client"}</div>
            {client?.email && <div style={{ fontSize: 12.5, color: "#5a7086" }}>{client.email}</div>}
          </div>
          <div style={{ textAlign: "right", fontSize: 12.5 }}>
            <div style={{ color: "#8a8368" }}>Invoice date</div>
            <div className="mono" style={{ marginBottom: 8 }}>{fmtDate(invoice.date)}</div>
            <div style={{ color: "#8a8368" }}>Due date</div>
            <div className="mono">{fmtDate(invoice.due_date)}</div>
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, marginBottom: 20 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--ledger-dark)" }}>
              <th style={{ textAlign: "left", padding: "6px 4px", fontSize: 11, color: "#8a8368" }}>Description</th>
              <th style={{ textAlign: "right", padding: "6px 4px", fontSize: 11, color: "#8a8368" }}>Time allotted</th>
              <th style={{ textAlign: "right", padding: "6px 4px", fontSize: 11, color: "#8a8368" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.line_items || []).map((li) => (
              <tr key={li.id} style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "9px 4px" }}>{li.description}</td>
                <td className="mono" style={{ padding: "9px 4px", textAlign: "right" }}>{li.hours ? `${li.hours} hrs` : "—"}</td>
                <td className="mono" style={{ padding: "9px 4px", textAlign: "right" }}>{money(li.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
          {invoice.status === "Paid" ? (
            <div style={{ border: "2px solid #2e6b3e", color: "#2e6b3e", borderRadius: 6, padding: "6px 14px", fontWeight: 700, fontSize: 13, transform: "rotate(-4deg)" }}>
              PAID{invoice.paid_date ? ` — ${fmtDate(invoice.paid_date)}` : ""}
            </div>
          ) : <span />}
          <div style={{ width: 220, display: "flex", justifyContent: "space-between", borderTop: "2px solid var(--ledger-dark)", paddingTop: 8 }}>
            <div style={{ fontWeight: 700 }}>Total due</div>
            <div className="mono" style={{ fontWeight: 700, fontSize: 16 }}>{money(total)}</div>
          </div>
        </div>
        {invoice.notes && <div style={{ fontSize: 12.5, color: "#5a7086", borderTop: "1px solid var(--line)", paddingTop: 14 }}>{invoice.notes}</div>}
      </div>
    </div>
  );
}

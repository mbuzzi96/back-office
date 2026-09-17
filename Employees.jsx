import { useState } from "react";
import * as XLSX from "xlsx";
import { Plus, UserCog, Pencil, Download } from "lucide-react";
import { db } from "../lib/db";
import { SectionHeader, Button, Chip, Field, Modal, EmptyState, fmtDate, todayISO } from "./ui";

export default function Employees({ employees, entries, clients, reload }) {
  const [modal, setModal] = useState(null);
  const [exportingFor, setExportingFor] = useState(null);

  const clientMap = {};
  clients.forEach((c) => (clientMap[c.id] = c));

  async function save(form) {
    if (form.id) await db.employees.update(form.id, form);
    else await db.employees.insert(form);
    setModal(null);
    reload();
  }
  async function remove(id) {
    await db.employees.remove(id);
    setModal(null);
    reload();
  }

  const stats = employees.map((emp) => {
    const own = entries.filter((e) => e.employee_id === emp.id);
    const totalHours = own.reduce((s, e) => s + e.minutes / 60, 0);
    const billableHours = own.filter((e) => e.billable).reduce((s, e) => s + e.minutes / 60, 0);
    const unbilledHours = own.filter((e) => e.billable && !e.billed).reduce((s, e) => s + e.minutes / 60, 0);
    const byClient = {};
    own.forEach((e) => { byClient[e.client_id] = (byClient[e.client_id] || 0) + e.minutes / 60; });
    return { emp, totalHours, billableHours, unbilledHours, byClient, entryCount: own.length };
  });

  return (
    <div>
      <SectionHeader title="Employees" subtitle={`${employees.length} on the team`} action={<Button onClick={() => setModal("new")}><Plus size={14} /> Add employee</Button>} />

      {employees.length === 0 ? (
        <EmptyState icon={UserCog} text="No employees yet." actionLabel="Add employee" onAction={() => setModal("new")} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {stats.map(({ emp, totalHours, billableHours, unbilledHours, byClient, entryCount }) => (
            <div key={emp.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{emp.name}</div>
                  <div style={{ fontSize: 12.5, color: "#6b84a0", marginTop: 2 }}>
                    {emp.role || "No role set"} {emp.active === false && <Chip text="Inactive" tone="neutral" />}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setExportingFor(emp)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ledger)" }}>
                    <Download size={14} />
                  </button>
                  <button onClick={() => setModal(emp)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ledger)" }}>
                    <Pencil size={14} />
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 24, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                <Stat label="Total hours" value={totalHours.toFixed(2)} />
                <Stat label="Billable hours" value={billableHours.toFixed(2)} />
                <Stat label="Unbilled hours" value={unbilledHours.toFixed(2)} />
                <Stat label="Entries" value={entryCount} />
              </div>
              {Object.keys(byClient).length > 0 && (
                <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {Object.entries(byClient).map(([cid, hours]) => (
                    <span key={cid} className="mono" style={{ fontSize: 12, background: "var(--sage)", color: "var(--ledger-dark)", borderRadius: 20, padding: "3px 10px" }}>
                      {clientMap[cid]?.name || "Unknown"} · {hours.toFixed(2)}h
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && <EmployeeModal employee={modal === "new" ? null : modal} onSave={save} onDelete={remove} onClose={() => setModal(null)} />}
      {exportingFor && <TimesheetExportModal employee={exportingFor} entries={entries} clientMap={clientMap} onClose={() => setExportingFor(null)} />}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 17, fontWeight: 600, color: "var(--ledger-dark)" }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "#6b84a0", marginTop: 1 }}>{label}</div>
    </div>
  );
}

function EmployeeModal({ employee, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(employee || { name: "", role: "", active: true, is_partner: false });
  return (
    <Modal title={employee ? "Edit employee" : "Add employee"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
        <Field label="Role / title"><input className="input" value={form.role || ""} onChange={(e) => setForm({ ...form, role: e.target.value })} /></Field>
        <div style={{ fontSize: 11.5, color: "#6b84a0" }}>
          To let this person log in, create their account in Supabase Authentication, then set this row's user_id (Table Editor) to their auth user's UUID.
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={form.active !== false} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={form.is_partner === true} onChange={(e) => setForm({ ...form, is_partner: e.target.checked })} /> Billing & Invoices access
        </label>
        <div style={{ fontSize: 11.5, color: "#6b84a0", marginTop: -6 }}>
          This is separate from being a firm partner — it's specifically who can see Time &amp; Billing and Invoices. Typically just one or two people (e.g. Michael Buzzi), not everyone with "Partner" listed on clients.
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          {employee ? <Button variant="danger" onClick={() => onDelete(employee.id)}>Remove</Button> : <span />}
          <Button onClick={() => form.name.trim() && onSave(form)}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

function TimesheetExportModal({ employee, entries, clientMap, onClose }) {
  const [mode, setMode] = useState("month");
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [error, setError] = useState("");

  function getRange() {
    if (mode === "month") {
      const [y, m] = month.split("-").map(Number);
      const start = `${month}-01`;
      const end = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
      return { start, end };
    }
    return { start: startDate, end: endDate };
  }

  function download() {
    const { start, end } = getRange();
    if (!start || !end || start > end) { setError("Check your dates."); return; }
    const rows = entries.filter((e) => e.employee_id === employee.id && e.date >= start && e.date <= end).sort((a, b) => a.date.localeCompare(b.date));
    if (rows.length === 0) { setError("No time entries fall in that range."); return; }
    const data = rows.map((e) => ({
      Date: e.date,
      Client: clientMap[e.client_id]?.name || "Unknown",
      Description: e.description || "",
      Hours: Number((e.minutes / 60).toFixed(2)),
      Billable: e.billable ? "Yes" : "No",
      Status: !e.billable ? "N/A" : e.billed ? "Billed" : "Unbilled",
    }));
    const totalHours = rows.reduce((s, e) => s + e.minutes / 60, 0);
    const billableHours = rows.filter((e) => e.billable).reduce((s, e) => s + e.minutes / 60, 0);
    data.push({ Date: "", Client: "", Description: "", Hours: "", Billable: "", Status: "" });
    data.push({ Date: "", Client: "", Description: "Total hours", Hours: Number(totalHours.toFixed(2)), Billable: "", Status: "" });
    data.push({ Date: "", Client: "", Description: "Billable hours", Hours: Number(billableHours.toFixed(2)), Billable: "", Status: "" });
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 12 }, { wch: 24 }, { wch: 36 }, { wch: 9 }, { wch: 10 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Timesheet");
    const label = mode === "month" ? month : `${start}_to_${end}`;
    const safeName = employee.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
    XLSX.writeFile(wb, `${safeName}-timesheet-${label}.xlsx`);
    onClose();
  }

  return (
    <Modal title={`Export timesheet — ${employee.name}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 18 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <input type="radio" checked={mode === "month"} onChange={() => setMode("month")} /> Month
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <input type="radio" checked={mode === "range"} onChange={() => setMode("range")} /> Custom range
          </label>
        </div>
        {mode === "month" ? (
          <Field label="Month"><input type="month" className="input" value={month} onChange={(e) => setMonth(e.target.value)} /></Field>
        ) : (
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Start date"><input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
            <Field label="End date"><input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
          </div>
        )}
        {error && <div style={{ color: "var(--rust)", fontSize: 12.5 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={download}><Download size={14} /> Download Excel</Button>
        </div>
      </div>
    </Modal>
  );
}

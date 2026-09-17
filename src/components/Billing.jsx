import { useState } from "react";
import { Clock } from "lucide-react";
import { db } from "../lib/db";
import { SectionHeader, Button, Chip, EmptyState, fmtDate, fmtHours } from "./ui";

export default function Billing({ entries, clients, employees, reload }) {
  const [filterClient, setFilterClient] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");

  const clientMap = {};
  clients.forEach((c) => (clientMap[c.id] = c));
  const employeeMap = {};
  employees.forEach((e) => (employeeMap[e.id] = e));

  async function markBilled(clientId) {
    const ids = entries.filter((e) => e.client_id === clientId && e.billable && !e.billed).map((e) => e.id);
    await Promise.all(ids.map((id) => db.timeEntries.update(id, { billed: true })));
    reload();
  }

  const filtered = entries
    .filter((e) => !filterClient || e.client_id === filterClient)
    .filter((e) => !filterEmployee || e.employee_id === filterEmployee)
    .sort((a, b) => b.date.localeCompare(a.date));

  const byClient = {};
  entries.forEach((e) => {
    if (!e.billable || e.billed) return;
    byClient[e.client_id] = (byClient[e.client_id] || 0) + e.minutes / 60;
  });

  return (
    <div>
      <SectionHeader title="Time & Billing" subtitle={`${entries.length} entries logged`} />

      {Object.keys(byClient).length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--ledger-dark)", marginBottom: 10 }}>Unbilled by client</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {Object.entries(byClient).map(([cid, hours]) => (
              <div key={cid} className="card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{clientMap[cid]?.name || "Unknown"}</div>
                  <div className="mono" style={{ fontSize: 13, color: "var(--ledger)" }}>{hours.toFixed(2)} hrs</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => markBilled(cid)}>Mark billed</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <select className="input" style={{ width: 180 }} value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
          <option value="">All clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input" style={{ width: 180 }} value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
          <option value="">All employees</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Clock} text="No time logged yet." />
      ) : (
        <table className="data">
          <thead><tr>{["Date", "Client", "Employee", "Description", "Hours", "Status"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id}>
                <td className="mono">{fmtDate(e.date)}</td>
                <td>{clientMap[e.client_id]?.name || "—"}</td>
                <td>{employeeMap[e.employee_id]?.name || "Unassigned"}</td>
                <td>{e.description}</td>
                <td className="mono">{fmtHours(e.minutes)}</td>
                <td>
                  {!e.billable ? <Chip text="Non-billable" tone="neutral" /> : e.billed ? <Chip text="Billed" tone="done" /> : <Chip text="Unbilled" tone="gold" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

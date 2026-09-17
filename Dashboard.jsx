import { Users, CheckSquare } from "lucide-react";
import { SectionHeader, fmtDate } from "./ui";

export default function Dashboard({ clients, tasks, goTo }) {
  const activeClients = clients.filter((c) => c.status === "Active");
  const openTasks = tasks.filter((t) => t.status !== "Done");
  const overdue = openTasks.filter((t) => t.due_date && new Date(t.due_date) < new Date(new Date().toDateString()));
  const upcoming = openTasks
    .filter((t) => {
      if (!t.due_date) return false;
      const days = (new Date(t.due_date) - new Date(new Date().toDateString())) / 86400000;
      return days >= 0 && days <= 7;
    })
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const cards = [
    { label: "Active clients", value: activeClients.length, icon: Users, onClick: () => goTo("clients") },
    { label: "Open tasks", value: openTasks.length, icon: CheckSquare, onClick: () => goTo("tasks") },
  ];

  return (
    <div>
      <SectionHeader title="Dashboard" subtitle={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 28 }}>
        {cards.map((c) => (
          <button key={c.label} onClick={c.onClick} className="card gold-top" style={{ textAlign: "left", cursor: "pointer" }}>
            <c.icon size={16} color="var(--ledger)" />
            <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, marginTop: 8, color: "var(--ledger-dark)" }}>{c.value}</div>
            <div style={{ fontSize: 12.5, color: "#6b84a0", marginTop: 2 }}>{c.label}</div>
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--ledger-dark)", marginBottom: 10 }}>Due this week</h3>
          {upcoming.length === 0 ? (
            <div style={{ fontSize: 13, color: "#8a8368" }}>Nothing due in the next 7 days.</div>
          ) : (
            upcoming.map((t) => (
              <Row key={t.id} left={t.title} sub={clients.find((c) => c.id === t.client_id)?.name || "No client"} right={fmtDate(t.due_date)} />
            ))
          )}
        </div>
        <div>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--rust)", marginBottom: 10 }}>Overdue</h3>
          {overdue.length === 0 ? (
            <div style={{ fontSize: 13, color: "#8a8368" }}>Nothing overdue.</div>
          ) : (
            overdue.map((t) => (
              <Row key={t.id} left={t.title} sub={clients.find((c) => c.id === t.client_id)?.name || "No client"} right={fmtDate(t.due_date)} rust />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ left, sub, right, rust }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 2px", borderBottom: "1px solid var(--line)", fontSize: 13.5 }}>
      <div>
        <div style={{ fontWeight: 600 }}>{left}</div>
        <div style={{ fontSize: 12, color: "#8a8368" }}>{sub}</div>
      </div>
      <div className="mono" style={{ fontSize: 12.5, color: rust ? "var(--rust)" : "#5c5540", alignSelf: "center" }}>{right}</div>
    </div>
  );
}

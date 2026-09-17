import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Timer,
  Clock,
  FileText,
  UserCog,
  Receipt,
  LogOut,
} from "lucide-react";
import { supabase } from "../supabaseClient";

export default function Sidebar({ tab, setTab, overdueCount, newForMeCount, isPartner }) {
  const badge = newForMeCount > 0 ? { count: newForMeCount, tone: "gold" } : overdueCount > 0 ? { count: overdueCount, tone: "rust" } : null;
  const items = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "clients", label: "Clients", icon: Users },
    { key: "tasks", label: "Tasks", icon: CheckSquare, badge },
    { key: "logtime", label: "Log Time", icon: Timer },
    ...(isPartner ? [{ key: "billing", label: "Time & Billing", icon: Clock }] : []),
    { key: "documents", label: "Documents", icon: FileText },
    { key: "employees", label: "Employees", icon: UserCog },
    ...(isPartner ? [{ key: "invoices", label: "Invoices", icon: Receipt }] : []),
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-title">
        Smith Buzzi & Associates
        <div className="sidebar-subtitle">Back Office</div>
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map(({ key, label, icon: Icon, badge }) => (
          <button key={key} onClick={() => setTab(key)} className={`nav-btn ${tab === key ? "active" : ""}`}>
            <Icon size={16} />
            <span className="nav-label">{label}</span>
            {!!badge && <span className={`nav-badge ${badge.tone}`}>{badge.count}</span>}
          </button>
        ))}
      </nav>
      <button
        onClick={() => supabase.auth.signOut()}
        style={{ display: "flex", alignItems: "center", gap: 8, border: "none", background: "transparent", color: "#a9c2de", padding: "10px 12px", fontSize: 12.5, cursor: "pointer", marginTop: 24, width: "100%" }}
      >
        <LogOut size={14} /> Sign out
      </button>
    </aside>
  );
}

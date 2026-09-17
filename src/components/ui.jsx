import { X } from "lucide-react";

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="section-header">
      <div>
        <h1 className="section-title">{title}</h1>
        {subtitle && <div className="section-subtitle">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

export function Button({ children, onClick, variant = "primary", size = "md", type = "button", disabled }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`btn ${variant} ${size === "sm" ? "sm" : ""}`}>
      {children}
    </button>
  );
}

export function Chip({ text, tone = "neutral" }) {
  return <span className={`chip ${tone}`}>{text}</span>;
}

export function Field({ label, children }) {
  return (
    <label className="field">
      {label}
      {children}
    </label>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#8a8368" }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, text, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <Icon size={28} style={{ marginBottom: 10, opacity: 0.6 }} />
      <div style={{ fontSize: 14, marginBottom: 14 }}>{text}</div>
      {actionLabel && (
        <Button onClick={onAction} size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function daysUntil(iso) {
  const d = new Date(iso + "T00:00:00");
  const t = new Date(todayISO() + "T00:00:00");
  return Math.round((d - t) / 86400000);
}

export function money(n) {
  return "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtHours(minutes) {
  return (minutes / 60).toFixed(2);
}

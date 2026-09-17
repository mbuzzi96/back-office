import { useState } from "react";
import { Lock } from "lucide-react";
import { supabase } from "../supabaseClient";
import { Field } from "./ui";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    if (!email || !password) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError(error.message);
  }

  function onKeyDown(e) {
    if (e.key === "Enter") submit();
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--paper)" }}>
      <div style={{ width: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--ledger-dark)" }}>
            Smith Buzzi & Associates
          </div>
          <div style={{ fontSize: 13, color: "#5a7086", marginTop: 4 }}>Back Office</div>
        </div>
        <div className="card">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Email">
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={onKeyDown} autoFocus />
            </Field>
            <Field label="Password">
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={onKeyDown} />
            </Field>
            {error && <div style={{ color: "var(--rust)", fontSize: 12.5 }}>{error}</div>}
            <button className="btn primary" onClick={submit} disabled={busy}>
              <Lock size={14} /> {busy ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </div>
        <div style={{ textAlign: "center", fontSize: 12, color: "#8ca5be", marginTop: 16 }}>
          Accounts are created by an admin in the Supabase dashboard — there's no public sign-up.
        </div>
      </div>
    </div>
  );
}

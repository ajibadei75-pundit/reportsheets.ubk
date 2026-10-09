import { useState } from "react";
import { call } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

export default function ChangePassword({ forced, onClose }) {
  const { refresh, profile } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ old: "", n: "", c: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (f.n.length < 8) return setErr("New password must be at least 8 characters.");
    if (f.n !== f.c) return setErr("The two new passwords do not match.");
    setBusy(true);
    try {
      await call("change_password", { old_password: f.old, new_password: f.n });
      toast("Password changed.");
      await refresh();
      onClose?.();
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }

  const box = (
    <form className="modal-box" onSubmit={submit}>
      <h3 style={{ marginTop: 0 }}>{forced ? "Choose your own password" : "Change password"}</h3>
      {forced && <p className="hint">Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}. For security, please replace the temporary password you were given.</p>}
      <label className="lbl">{forced ? "Temporary password" : "Current password"}
        <input type="password" autoComplete="current-password" value={f.old} onChange={(e) => setF({ ...f, old: e.target.value })} required /></label>
      <label className="lbl">New password (min. 8 characters)
        <input type="password" autoComplete="new-password" value={f.n} onChange={(e) => setF({ ...f, n: e.target.value })} required /></label>
      <label className="lbl">Confirm new password
        <input type="password" autoComplete="new-password" value={f.c} onChange={(e) => setF({ ...f, c: e.target.value })} required /></label>
      {err && <div className="err">{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
        {!forced && <button type="button" className="btn" onClick={onClose}>Cancel</button>}
      </div>
    </form>
  );
  return <div className="modal">{box}</div>;
}

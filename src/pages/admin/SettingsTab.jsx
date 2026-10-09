import { useEffect, useState } from "react";
import { call } from "../../lib/api";
import { longDate } from "../../lib/dates";

export default function SettingsTab() {
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { call("get_settings").then((d) => setS(d.settings)); }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      const d = await call("update_settings", { fields: {
        school_name: s.school_name, term: s.term, session: s.session,
        next_term_begins: s.next_term_begins, time_school_opened: s.time_school_opened,
      }});
      setS(d.settings);
      setMsg("Saved. This applies to every report card immediately.");
    } finally { setBusy(false); }
  }

  if (!s) return <p>Loading…</p>;

  return (
    <div>
      <div className="pagehead"><h2>School Settings</h2><p>These apply school-wide, to both the Basic and Secondary sections.</p></div>
      <div className="card">
        <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 420 }}>
          <label>School name<input value={s.school_name || ""} onChange={(e) => setS({ ...s, school_name: e.target.value })} /></label>
          <label>Term
            <select value={s.term || ""} onChange={(e) => setS({ ...s, term: e.target.value })}>
              <option>First Term</option><option>Second Term</option><option>Third Term</option>
            </select>
          </label>
          <label>Session (e.g. 2025/2026)<input value={s.session || ""} onChange={(e) => setS({ ...s, session: e.target.value })} /></label>
          <label>Time school opened<input value={s.time_school_opened || ""} onChange={(e) => setS({ ...s, time_school_opened: e.target.value })} /></label>
          <label>Next term begins<input type="date" value={s.next_term_begins || ""} onChange={(e) => setS({ ...s, next_term_begins: e.target.value })} />{s.next_term_begins && <small style={{ color: "#0d1b6e" }}>Prints as: {longDate(s.next_term_begins)}</small>}</label>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button>
          {msg && <div className="msg">{msg}</div>}
        </form>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { call } from "../../lib/api";
import { useToast } from "../../components/Toast";

const FIELDS = ["first_ca", "second_ca", "exam"];

export default function SubjectTeacherDashboard() {
  const { assignments } = useAuth();
  const toast = useToast();
  const [sel, setSel] = useState(0);
  const [rows, setRows] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [approval, setApproval] = useState(null);
  const [busy, setBusy] = useState(false);

  const a = assignments?.[sel] || assignments?.[0];

  async function load() {
    if (!a) return;
    setRows(null); setDirty(false);
    let d;
    try { d = await call("get_subject_roster", { class_id: a.class.id, subject_id: a.subject.id }); }
    catch (e) { toast(e.message, "err"); setRows([]); return; }
    setRows(d.students.map((s) => {
      const sc = d.scores.find((x) => x.student_id === s.id);
      return { id: s.id, name: s.name, code: s.student_code, first_ca: sc?.first_ca ?? "", second_ca: sc?.second_ca ?? "", exam: sc?.exam ?? "", remark: sc?.remark || "", expected_updated_at: sc?.updated_at };
    }));
    setApproval(d.approval);
  }
  useEffect(() => { load(); }, [sel, assignments]);

  useEffect(() => {
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (!assignments?.length) {
    return <div className="content"><div className="card empty"><h3>Nothing assigned yet</h3>The admin has not given you a class and subject. Please contact the admin.</div></div>;
  }

  const num = (v) => (v === "" ? null : Number(v));
  const totalOf = (r) => (Number(r.first_ca) || 0) + (Number(r.second_ca) || 0) + (Number(r.exam) || 0);
  const touched = (r) => r.first_ca !== "" || r.second_ca !== "" || r.exam !== "";
  const invalid = (r) => totalOf(r) > 100 || FIELDS.some((f) => r[f] !== "" && (Number(r[f]) < 0 || Number(r[f]) > 100));

  function set(i, field, value) {
    setDirty(true);
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }
  function onKey(e, i, f) {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      document.querySelector(`[data-row="${i + 1}"][data-col="${f}"]`)?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      document.querySelector(`[data-row="${i - 1}"][data-col="${f}"]`)?.focus();
    }
  }

  async function saveAll() {
    const bad = rows.find(invalid);
    if (bad) return toast(`${bad.name}: scores must be between 0 and 100 and total no more than 100.`, "err");
    setBusy(true);
    let conflicts = 0;
    try {
      for (const r of rows) {
        if (!touched(r) && !r.remark && !r.expected_updated_at) continue;
        try {
          const res = await call("save_score", { student_id: r.id, subject_id: a.subject.id, first_ca: num(r.first_ca), second_ca: num(r.second_ca), exam: num(r.exam), remark: r.remark || null, expected_updated_at: r.expected_updated_at });
          setRows((rs) => rs.map((row) => (row.id === r.id ? { ...row, expected_updated_at: res.score.updated_at } : row)));
        } catch (e) {
          if (e.conflict) {
            conflicts++;
            setRows((rs) => rs.map((row) => (row.id === r.id ? {
              ...row, first_ca: e.current.first_ca ?? "", second_ca: e.current.second_ca ?? "", exam: e.current.exam ?? "", remark: e.current.remark || "", expected_updated_at: e.current.updated_at,
            } : row)));
          } else throw e;
        }
      }
      setDirty(false);
      if (conflicts) toast(`${conflicts} score(s) were just changed by someone else (likely the class teacher or admin) — their latest values are shown. Review and save again if needed.`, "err");
      else toast("All scores saved.");
    } catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }

  const entered = rows ? rows.filter((r) => r.exam !== "").length : 0;
  const pct = rows?.length ? Math.round((entered / rows.length) * 100) : 0;

  return (
    <div className="content">
      <div className="pagehead"><h2>Enter scores</h2><p>Pick a class and subject, type the scores, then press Save. Use Enter or the arrow keys to move down a column.</p></div>
      <div className="card">
        <label className="lbl" style={{ margin: 0 }}>Class and subject
          <select value={sel} onChange={(e) => { if (dirty && !confirm("You have unsaved scores. Switch anyway?")) return; setSel(Number(e.target.value)); }}>
            {assignments.map((x, i) => <option key={i} value={i}>{x.class.name} — {x.subject.name}</option>)}
          </select>
        </label>
        {rows && rows.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div className={"progress" + (pct === 100 ? " full" : "")}><i style={{ width: pct + "%" }} /></div>
            <span className="hint">{entered} of {rows.length} students have an exam score</span>
          </div>
        )}
      </div>

      {approval?.status === "approved" && <div className="banner ok"><b>This class has been approved for printing and is now locked.</b> Ask the admin to reopen it if a correction is needed.</div>}
      {!rows ? <p>Loading…</p> : !rows.length ? <div className="card empty">No students in this class yet. Ask the admin to add them.</div> : (
        <div className="card">
          <table className="datatable scoretable">
            <thead><tr><th>#</th><th>Student</th><th>1st C.A</th><th>2nd C.A</th><th>Exam</th><th>Total</th><th>Remark (optional)</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td>{i + 1}</td>
                  <td><b>{r.name}</b></td>
                  {FIELDS.map((f) => (
                    <td key={f} className={r[f] !== "" && (Number(r[f]) < 0 || Number(r[f]) > 100) ? "bad" : ""}>
                      <input type="number" inputMode="numeric" min="0" max="100" data-row={i} data-col={f} value={r[f]} disabled={approval?.status === "approved"}
                        onChange={(e) => set(i, f, e.target.value)} onKeyDown={(e) => onKey(e, i, f)} onFocus={(e) => e.target.select()} />
                    </td>
                  ))}
                  <td style={{ fontWeight: 700, color: totalOf(r) > 100 ? "var(--bad)" : undefined }}>{touched(r) ? totalOf(r) : ""}</td>
                  <td><input style={{ width: 140 }} value={r.remark} onChange={(e) => set(i, "remark", e.target.value)} disabled={approval?.status === "approved"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="savebar">
            <button className="btn btn-primary" onClick={saveAll} disabled={busy || !dirty || approval?.status === "approved"}>{approval?.status === "approved" ? "Locked" : busy ? "Saving…" : "Save all scores"}</button>
            {dirty ? <span className="dirty">● Unsaved changes</span> : <span className="hint">All changes saved</span>}
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { call } from "../../lib/api";

export default function GradingTab() {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const d = await call("get_grading_scale");
    setRows(d.grading_scale || []);
  }
  useEffect(() => { load(); }, []);

  function update(i, field, value) {
    setRows((r) => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  }
  function addRow() {
    setRows((r) => [...r, { min_score: 0, max_score: 0, grade: "", remark: "" }]);
  }
  function removeRow(i) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  async function save() {
    setBusy(true); setMsg("");
    try {
      await call("update_grading_scale", { rows: rows.map((r) => ({
        min_score: Number(r.min_score), max_score: Number(r.max_score), grade: r.grade, remark: r.remark,
      }))});
      setMsg("Grading scale updated. All report cards will now use these boundaries.");
      await load();
    } finally { setBusy(false); }
  }

  return (
    <div>
      <div className="pagehead">
        <h2>Grading Scale</h2>
        <p>This determines the letter grade shown on every report card, based on each subject's total score (CA + Exam). It applies to both sections.</p>
      </div>
      <div className="card">
        <table className="datatable">
          <thead><tr><th>Min score</th><th>Max score</th><th>Grade</th><th>Remark</th><th></th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td><input type="number" value={r.min_score} onChange={(e) => update(i, "min_score", e.target.value)} style={{ width: 70 }} /></td>
                <td><input type="number" value={r.max_score} onChange={(e) => update(i, "max_score", e.target.value)} style={{ width: 70 }} /></td>
                <td><input value={r.grade} onChange={(e) => update(i, "grade", e.target.value)} style={{ width: 50 }} /></td>
                <td><input value={r.remark} onChange={(e) => update(i, "remark", e.target.value)} style={{ width: 160 }} /></td>
                <td><button className="btn btn-danger" onClick={() => removeRow(i)}>x</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="btn" style={{ marginTop: 10 }} onClick={addRow}>+ Add band</button>
        <div style={{ marginTop: 10 }}>
          <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save grading scale"}</button>
        </div>
        {msg && <div className="msg">{msg}</div>}
      </div>
    </div>
  );
}

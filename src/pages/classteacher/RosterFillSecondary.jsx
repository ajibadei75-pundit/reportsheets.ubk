import { useEffect, useState } from "react";
import { call } from "../../lib/api";
import StudentNav from "../../components/StudentNav";
import { useToast } from "../../components/Toast";
import { SKILLS, BEHAVIOUR } from "../../components/ReportCardSecondary";

const RATINGS = ["A", "B", "C", "D", "E"];

export default function RosterFillSecondary({ classId }) {
  const [data, setData] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [idx, setIdx] = useState(0);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState("");
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function load() {
    try { setData(await call("get_class_roster", { class_id: classId })); setLoadErr(""); }
    catch (e) { setLoadErr(e.message); }
  }
  useEffect(() => { setData(null); setIdx(0); load(); }, [classId]);

  const report = data?.reports?.[idx];

  useEffect(() => {
    if (!report) { setForm(null); return; }
    const s = report.student;
    setForm({
      time_present: s.time_present || "",
      class_teacher_remark: s.class_teacher_remark || "",
      skills: s.skills || {},
      behaviour: s.behaviour || {},
    });
    setMsg("");
  }, [report?.student?.id, data]);

  if (loadErr) return <div className="banner bad"><b>Couldn't load this class.</b> {loadErr} <button className="linkbtn" onClick={load}>Try again</button></div>;
  if (!data) return <p>Loading…</p>;
  if (!data.reports.length) return <p>No students in this class yet. Ask the admin to add students.</p>;
  if (!form) return null;
  const locked = data.approval?.status === "approved";

  async function save() {
    setBusy(true); setMsg("");
    try {
      await call("update_student", { id: report.student.id, fields: form });
      await load();
      setMsg("Saved ✓"); toast("Saved " + report.student.name);
    } catch (e) { setMsg("Error: " + e.message); } finally { setBusy(false); }
  }

  const RatingRow = ({ label, group }) => (
    <tr>
      <td>{label}</td>
      <td>
        {RATINGS.map((r) => (
          <label key={r} style={{ marginRight: 10 }}>
            <input type="radio" name={group + label} checked={form[group][label] === r}
              onChange={() => setForm({ ...form, [group]: { ...form[group], [label]: r } })} disabled={locked} /> {r}
          </label>
        ))}
      </td>
    </tr>
  );

  return (
    <div>
      {locked && <div className="banner ok"><b>This class has been approved for printing and is now locked.</b> Ask the admin to reopen it (Overview tab) if a correction is needed.</div>}
      <StudentNav data={data} idx={idx} setIdx={setIdx} />

      <div className="card">
        <h3>Scores entered by subject teachers (read-only)</h3>
        <table className="datatable">
          <thead><tr><th>Subject</th><th>1st CA</th><th>2nd CA</th><th>Exam</th><th>Total</th><th>Grade</th><th>Pos.</th></tr></thead>
          <tbody>
            {report.rows.map((r) => (
              <tr key={r.subject_id}>
                <td>{r.subject_name}</td><td>{r.first_ca ?? ""}</td><td>{r.second_ca ?? ""}</td>
                <td>{r.exam ?? ""}</td><td>{r.total ?? ""}</td><td>{r.grade}</td><td>{r.position}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 12, color: "#666" }}>
          Total {report.totalObtained}/{report.totalObtainable} — {report.percentage}% — Position {report.overallPosition}
        </p>
      </div>

      <div className="card">
        <label>Time present<br /><input value={form.time_present} onChange={(e) => setForm({ ...form, time_present: e.target.value })} disabled={locked} /></label>
      </div>

      <div className="card">
        <h3>Skills</h3>
        <table className="datatable"><tbody>{SKILLS.map((k) => <RatingRow key={k} label={k} group="skills" />)}</tbody></table>
      </div>
      <div className="card">
        <h3>Behaviour</h3>
        <table className="datatable"><tbody>{BEHAVIOUR.map((k) => <RatingRow key={k} label={k} group="behaviour" />)}</tbody></table>
        <p style={{ fontSize: 12, color: "#666" }}>A = excellent, B = high, C = acceptable, D = minimal, E = none.</p>
      </div>
      <div className="card">
        <h3>Class teacher's remark</h3>
        <textarea rows={3} style={{ width: "100%" }} value={form.class_teacher_remark}
          onChange={(e) => setForm({ ...form, class_teacher_remark: e.target.value })} disabled={locked} />
      </div>

      <button className="btn btn-primary" onClick={save} disabled={busy || locked}>{locked ? "Locked" : busy ? "Saving…" : "Save this student"}</button>
      {msg && <span style={{ marginLeft: 10 }} className={msg.startsWith("Error") ? "err" : "msg"}>{msg}</span>}
    </div>
  );
}

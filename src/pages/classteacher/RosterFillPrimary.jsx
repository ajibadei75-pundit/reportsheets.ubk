import { useEffect, useState } from "react";
import { call } from "../../lib/api";
import { AFFECTIVE } from "../../components/ReportCardPrimary";
import StudentNav from "../../components/StudentNav";
import { useToast } from "../../components/Toast";

// Basic / Nursery / KG section: the CLASS TEACHER enters everything, including
// each subject's Continuous Assessment and Exam score for every pupil.
export default function RosterFillPrimary({ classId }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [idx, setIdx] = useState(0);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);

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
      max_attendance: s.max_attendance || "", time_present: s.time_present || "",
      weight: s.weight || "", height: s.height || "",
      class_teacher_remark: s.class_teacher_remark || "", behaviour: s.behaviour || {},
      scores: Object.fromEntries(report.rows.map((r) => [r.subject_id, {
        first_ca: r.first_ca ?? "", exam: r.exam ?? "", remark: r.remark || "", expected_updated_at: r.updated_at,
      }])),
    });
    setMsg("");
  }, [report?.student?.id, data]);

  if (loadErr) return <div className="banner bad"><b>Couldn't load this class.</b> {loadErr} <button className="linkbtn" onClick={load}>Try again</button></div>;
  if (!data) return <p>Loading…</p>;
  if (!data.reports.length) return <div className="card empty">No students in this class yet. Ask the admin to add them.</div>;
  if (!data.subjects.length) return <div className="card empty">No subjects assigned to this class yet. Ask the admin to set them under Subjects.</div>;
  if (!form) return null;
  const locked = data.approval?.status === "approved";

  const num = (v) => (v === "" ? null : Number(v));

  async function save() {
    setBusy(true); setMsg("");
    const s = report.student;
    try {
      await call("update_student", { id: s.id, fields: {
        max_attendance: form.max_attendance, time_present: form.time_present,
        weight: form.weight, height: form.height,
        class_teacher_remark: form.class_teacher_remark, behaviour: form.behaviour,
      }});
      let conflicts = 0;
      for (const sub of data.subjects) {
        const sc = form.scores[sub.id];
        if (sc.first_ca === "" && sc.exam === "" && !sc.remark && !sc.expected_updated_at) continue;
        try {
          const r = await call("save_score", {
            student_id: s.id, subject_id: sub.id,
            first_ca: num(sc.first_ca), second_ca: null, exam: num(sc.exam), remark: sc.remark || null,
            expected_updated_at: sc.expected_updated_at,
          });
          setForm((f) => f && { ...f, scores: { ...f.scores, [sub.id]: { ...f.scores[sub.id], expected_updated_at: r.score.updated_at } } });
        } catch (e) {
          if (e.conflict) {
            conflicts++;
            setForm((f) => f && { ...f, scores: { ...f.scores, [sub.id]: {
              first_ca: e.current.first_ca ?? "", exam: e.current.exam ?? "", remark: e.current.remark || "", expected_updated_at: e.current.updated_at,
            } } });
          } else throw e;
        }
      }
      await load();
      if (conflicts) toast(`${conflicts} subject score(s) were just changed by someone else — their latest values are shown. Please review and save again.`, "err");
      else { setMsg("Saved ✓"); toast("Saved " + s.name); }
    } catch (e) { setMsg("Error: " + e.message); toast(e.message, "err"); } finally { setBusy(false); }
  }

  function setScore(subId, field, value) {
    setForm((f) => ({ ...f, scores: { ...f.scores, [subId]: { ...f.scores[subId], [field]: value } } }));
  }

  return (
    <div>
      {locked && <div className="banner ok"><b>This class has been approved for printing and is now locked.</b> Ask the admin to reopen it (Overview tab) if a correction is needed.</div>}
      <StudentNav data={data} idx={idx} setIdx={setIdx} />

      <div className="card">
        <h3>Attendance &amp; measurements</h3>
        <div className="row">
          <label className="lbl">Max attendance<input value={form.max_attendance} onChange={(e) => setForm({ ...form, max_attendance: e.target.value })} disabled={locked} /></label>
          <label className="lbl">No. of times present<input value={form.time_present} onChange={(e) => setForm({ ...form, time_present: e.target.value })} disabled={locked} /></label>
          <label className="lbl">Weight<input value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} disabled={locked} /></label>
          <label className="lbl">Height<input value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} disabled={locked} /></label>
        </div>
      </div>

      <div className="card">
        <h3>Subject scores — Continuous Assessment &amp; Exam</h3>
        <table className="datatable scoretable">
          <thead><tr><th>Subject</th><th>Contn. Assess</th><th>Exam</th><th>Total</th><th>Remark</th></tr></thead>
          <tbody>
            {data.subjects.map((sub) => {
              const sc = form.scores[sub.id];
              const total = (Number(sc.first_ca) || 0) + (Number(sc.exam) || 0);
              return (
                <tr key={sub.id}>
                  <td><b>{sub.name}</b></td>
                  <td><input type="number" min="0" max="100" value={sc.first_ca} onChange={(e) => setScore(sub.id, "first_ca", e.target.value)} disabled={locked} /></td>
                  <td><input type="number" min="0" max="100" value={sc.exam} onChange={(e) => setScore(sub.id, "exam", e.target.value)} disabled={locked} /></td>
                  <td style={{ fontWeight: 700 }}>{sc.first_ca === "" && sc.exam === "" ? "" : total}</td>
                  <td><input style={{ width: 150 }} value={sc.remark} onChange={(e) => setScore(sub.id, "remark", e.target.value)} disabled={locked} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Affective domain (5 = best, 1 = weakest)</h3>
        <table className="datatable">
          <tbody>
            {AFFECTIVE.map((k) => (
              <tr key={k}>
                <td>{k}</td>
                <td className="row" style={{ gap: 14 }}>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <label key={n}><input type="radio" name={k} checked={Number(form.behaviour[k]) === n}
                      onChange={() => setForm({ ...form, behaviour: { ...form.behaviour, [k]: n } })} disabled={locked} /> {n}</label>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Class teacher's comment</h3>
        <textarea rows={3} style={{ width: "100%" }} value={form.class_teacher_remark} onChange={(e) => setForm({ ...form, class_teacher_remark: e.target.value })} disabled={locked} />
      </div>

      <div className="savebar">
        <button className="btn btn-primary" onClick={save} disabled={busy || locked}>{locked ? "Locked" : busy ? "Saving…" : "Save this student"}</button>
        {msg && <span className={msg.startsWith("Error") ? "err" : "msg"}>{msg}</span>}
      </div>
    </div>
  );
}

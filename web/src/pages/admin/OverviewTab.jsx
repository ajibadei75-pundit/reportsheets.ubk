import { useEffect, useState } from "react";
import { call } from "../../lib/api";
import { longDate } from "../../lib/dates";
import { useToast } from "../../components/Toast";

export default function OverviewTab({ go }) {
  const toast = useToast();
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");

  async function load() {
    try { setD(await call("admin_overview")); } catch (e) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  if (err) return <div className="err">{err}</div>;
  if (!d) return <p>Loading overview…</p>;

  const classes = d.classes;
  const totalStudents = classes.reduce((a, c) => a + c.students, 0);
  const s = d.settings || {};
  const steps = [
    { done: !!(s.term && s.session && s.next_term_begins), title: "Set the term, session and next-term date", hint: "Printed on every report sheet.", tab: "settings", label: "Open settings" },
    { done: classes.length > 0, title: "Add your classes", hint: "Basic / Nursery / KG and Secondary sections.", tab: "classes", label: "Add classes" },
    { done: classes.length > 0 && classes.every((c) => c.subjects > 0), title: "Choose the subjects each class offers", hint: "Only these subjects appear on that class's sheet.", tab: "subjects", label: "Assign subjects" },
    { done: classes.length > 0 && classes.every((c) => c.students > 0), title: "Add the students in every class", hint: "You can paste a whole class list at once.", tab: "students", label: "Add students" },
    { done: classes.length > 0 && classes.every((c) => c.class_teacher), title: "Create a class teacher for every class", hint: "Then create subject teachers for the secondary subjects.", tab: "teachers", label: "Create teachers" },
    { done: classes.length > 0 && classes.every((c) => c.class_teacher && c.has_signature), title: "Class teachers upload their signatures", hint: "Teachers do this from their own login (My Signature).", tab: null },
  ];
  const nextStep = steps.find((x) => !x.done);
  const submitted = classes.filter((c) => c.status === "submitted");

  async function decide(c, status) {
    let admin_note = null;
    if (status === "rejected") {
      admin_note = prompt("What should the class teacher fix?");
      if (admin_note === null) return;
    }
    await call("set_approval_status", { class_id: c.id, status, admin_note });
    const messages = { approved: `${c.name} approved for printing.`, rejected: `${c.name} sent back to the class teacher.`, draft: `${c.name} reopened — the class teacher can edit it again.` };
    toast(messages[status] || "Updated.");
    load();
  }

  const Group = ({ title, list }) => (
    <div className="card">
      <h3>{title}</h3>
      {!list.length ? <div className="empty">No classes yet.</div> : (
        <table className="datatable">
          <thead><tr><th>Class</th><th>Class teacher</th><th>Students</th><th>Scores entered</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {list.map((c) => {
              const pct = c.expected ? Math.min(100, Math.round((c.filled / c.expected) * 100)) : 0;
              return (
                <tr key={c.id}>
                  <td><b>{c.name}</b></td>
                  <td>{c.class_teacher || <span className="hint">not assigned</span>}</td>
                  <td>{c.students}</td>
                  <td style={{ minWidth: 130 }}>
                    <div className={"progress" + (pct === 100 ? " full" : "")}><i style={{ width: pct + "%" }} /></div>
                    <span className="hint">{c.filled}/{c.expected} ({pct}%)</span>
                  </td>
                  <td><span className={"badge " + c.status}>{c.status === "submitted" ? "awaiting approval" : c.status}</span></td>
                  <td className="row">
                    {c.status === "submitted" && <>
                      <button className="btn btn-primary btn-sm" onClick={() => decide(c, "approved")}>Approve</button>
                      <button className="btn btn-danger btn-sm" onClick={() => decide(c, "rejected")}>Send back</button>
                    </>}
                    {c.status === "approved" && <>
                      <button className="btn btn-sm" onClick={() => go("bulk")}>Download</button>
                      <button className="btn btn-sm" onClick={() => decide(c, "draft")}>Reopen for editing</button>
                    </>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div>
      <div className="pagehead">
        <h2>Overview</h2>
        <p>{s.term} · {s.session}{s.next_term_begins ? ` · Next term begins ${longDate(s.next_term_begins)}` : ""}</p>
      </div>

      {submitted.length > 0 && (
        <div className="banner warn"><b>{submitted.length} class{submitted.length > 1 ? "es are" : " is"} waiting for your approval:</b> {submitted.map((c) => c.name).join(", ")}.</div>
      )}

      <div className="stats">
        <div className="stat"><b>{classes.length}</b><span>Classes</span></div>
        <div className="stat"><b>{totalStudents}</b><span>Students</span></div>
        <div className="stat"><b>{d.teacher_count}</b><span>Teachers</span></div>
        <div className="stat"><b>{d.subject_count}</b><span>Subjects</span></div>
      </div>

      {nextStep && (
        <div className="card">
          <h3>Getting started</h3>
          {steps.map((st, i) => (
            <div key={i} className={"check" + (st.done ? " done" : "")}>
              <span className="tick">{st.done ? "✓" : i + 1}</span>
              <span className="txt">{st.title}<small>{st.hint}</small></span>
              {!st.done && st.tab && <button className="btn btn-sm" onClick={() => go(st.tab)}>{st.label}</button>}
            </div>
          ))}
        </div>
      )}

      <Group title="Basic / Nursery / KG" list={classes.filter((c) => c.section === "basic")} />
      <Group title="Secondary / College" list={classes.filter((c) => c.section === "secondary")} />
    </div>
  );
}

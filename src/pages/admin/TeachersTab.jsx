import { useEffect, useState } from "react";
import { call } from "../../lib/api";
import { useToast } from "../../components/Toast";

const genPw = () => "Kh" + Math.random().toString(36).slice(2, 8) + Math.floor(10 + Math.random() * 90);

export default function TeachersTab({ classes, subjects, reload }) {
  const toast = useToast();
  const [teachers, setTeachers] = useState([]);
  const [created, setCreated] = useState(null);
  const [form, setForm] = useState({ username: "", full_name: "", password: "", role: "class_teacher", class_id: "" });
  const [assignments, setAssignments] = useState([{ class_id: "", subject_id: "" }]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const basicClasses = classes.filter((c) => c.section === "basic");
  const secondaryClasses = classes.filter((c) => c.section === "secondary");

  async function loadTeachers() { setTeachers((await call("list_teachers")).teachers || []); }
  useEffect(() => { loadTeachers(); }, []);

  function addAssignmentRow() { setAssignments((a) => [...a, { class_id: "", subject_id: "" }]); }
  function updateAssignment(i, field, value) {
    setAssignments((a) => a.map((row, idx) => (idx === i ? { ...row, [field]: value, ...(field === "class_id" ? { subject_id: "" } : {}) } : row)));
  }
  function removeAssignmentRow(i) { setAssignments((a) => a.filter((_, idx) => idx !== i)); }
  function subjectsFor(classId) {
    const cls = classes.find((c) => c.id === classId);
    return subjects.filter((s) => s.section === cls?.section);
  }

  async function createTeacher(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const payload = { ...form };
      if (form.role === "subject_teacher") payload.assignments = assignments.filter((a) => a.class_id && a.subject_id);
      await call("create_teacher", payload);
      setCreated({ name: form.full_name, username: form.username.trim().toLowerCase(), password: form.password });
      setForm({ username: "", full_name: "", password: "", role: "class_teacher", class_id: "" });
      setAssignments([{ class_id: "", subject_id: "" }]);
      await loadTeachers();
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }

  async function resetPassword(id) {
    const pw = genPw();
    if (!confirm(`Reset this teacher's password to a new temporary one?\n\nNew password: ${pw}\n\n(Copy it now — you can't see it again.)`)) return;
    await call("reset_teacher_password", { profile_id: id, new_password: pw });
    navigator.clipboard?.writeText(pw);
    toast(`Password reset to ${pw} (copied). The teacher must choose their own at next login.`);
  }

  async function removeTeacher(id) {
    if (!confirm("Remove this teacher account?")) return;
    await call("delete_teacher", { id });
    await loadTeachers();
  }

  return (
    <div>
      <div className="pagehead">
        <h2>Teachers</h2>
        <p>Every class — Basic or Secondary — needs one class teacher. Basic class teachers fill in every score themselves; Secondary class teachers add remarks and a signature while subject teachers fill the scores.</p>
      </div>

      <div className="card">
        <h3>Create a teacher account</h3>
        {created && (
          <div className="banner ok">
            <b>{created.name}'s account is ready.</b> Give them these details — they'll choose their own password at first login:<br />
            Username: <b>{created.username}</b> &nbsp;·&nbsp; Temporary password: <b>{created.password}</b>{" "}
            <button type="button" className="btn btn-sm" onClick={() => { navigator.clipboard?.writeText(`Username: ${created.username}\nPassword: ${created.password}`); toast("Copied."); }}>Copy</button>
          </div>
        )}
        <form onSubmit={createTeacher}>
          <div className="row" style={{ marginBottom: 10 }}>
            <input placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            <span className="row" style={{ gap: 4 }}>
              <input placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              <button type="button" className="btn btn-sm" onClick={() => setForm({ ...form, password: genPw() })}>Generate</button>
            </span>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, class_id: "" })}>
              <option value="class_teacher">Class Teacher (Basic/Nursery/KG)</option>
              <option value="subject_teacher">Subject Teacher (Secondary)</option>
            </select>
          </div>

          {form.role === "class_teacher" && (
            <label className="lbl" style={{ maxWidth: 320 }}>Class assigned
              <select value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })} required>
                <option value="">Choose a class…</option>
                {basicClasses.length > 0 && <optgroup label="Basic / Nursery / KG">{basicClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
                {secondaryClasses.length > 0 && <optgroup label="Secondary / College">{secondaryClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
              </select>
              <span className="hint">A Basic class teacher fills in scores directly. A Secondary class teacher adds remarks, skills, behaviour and their signature — subject teachers fill the scores.</span>
            </label>
          )}

          {form.role === "subject_teacher" && (
            <div style={{ marginBottom: 10 }}>
              <label className="lbl" style={{ marginBottom: 6 }}>Class + subject combinations this teacher handles</label>
              {assignments.map((a, i) => (
                <div key={i} className="row" style={{ margin: "6px 0" }}>
                  <select value={a.class_id} onChange={(e) => updateAssignment(i, "class_id", e.target.value)}>
                    <option value="">Secondary class…</option>
                    {secondaryClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={a.subject_id} onChange={(e) => updateAssignment(i, "subject_id", e.target.value)} disabled={!a.class_id}>
                    <option value="">Subject…</option>
                    {subjectsFor(a.class_id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeAssignmentRow(i)}>Remove</button>
                </div>
              ))}
              <button type="button" className="btn btn-sm" onClick={addAssignmentRow}>+ Add another class/subject</button>
              {!secondaryClasses.length && <p className="hint">No secondary classes exist yet.</p>}
            </div>
          )}
          {err && <div className="err">{err}</div>}
          <button className="btn btn-primary" disabled={busy}>{busy ? "Creating…" : "Create teacher account"}</button>
        </form>
      </div>

      <div className="card">
        <h3>All teachers</h3>
        {!teachers.length ? <p className="empty">No teachers yet.</p> : (
          <table className="datatable">
            <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Assigned to</th><th></th></tr></thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id}>
                  <td><b>{t.full_name}</b></td>
                  <td>{t.username}</td>
                  <td>{t.role === "class_teacher" ? "Class teacher" : "Subject teacher"}</td>
                  <td>
                    {t.role === "class_teacher"
                      ? (t.classes || []).map((c) => c?.name).join(", ") || <span className="hint">not assigned</span>
                      : (t.assignments || []).length
                        ? t.assignments.map((a, i) => <div key={i}>{a.class?.name} — {a.subject?.name}</div>)
                        : <span className="hint">not assigned</span>}
                  </td>
                  <td className="row">
                    <button className="btn btn-sm" onClick={() => resetPassword(t.id)}>Reset password</button>
                    <button className="btn btn-danger btn-sm" onClick={() => removeTeacher(t.id)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

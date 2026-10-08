import { useEffect, useState } from "react";
import { call } from "../../lib/api";
import { useToast } from "../../components/Toast";

export default function StudentsTab({ classes }) {
  const toast = useToast();
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState([]);
  const [bulkText, setBulkText] = useState("");
  const [newName, setNewName] = useState("");
  const [newSex, setNewSex] = useState("");
  const [busy, setBusy] = useState(false);

  const basicClasses = classes.filter((c) => c.section === "basic");
  const secondaryClasses = classes.filter((c) => c.section === "secondary");
  const cls = classes.find((c) => c.id === classId);

  async function load(id) {
    if (!id) { setStudents([]); return; }
    const d = await call("list_students", { class_id: id });
    setStudents(d.students || []);
  }
  useEffect(() => { load(classId); }, [classId]);

  async function addOne(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await call("create_student", { class_id: classId, name: newName.trim(), sex: newSex });
      setNewName(""); setNewSex("");
      await load(classId);
      toast("Student added.");
    } catch (e2) { toast(e2.message, "err"); }
  }

  async function addBulk() {
    const lines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    const students = lines.map((l) => {
      const [name, sex] = l.split(",").map((x) => x?.trim());
      return { name, sex: sex || null };
    });
    setBusy(true);
    try {
      await call("bulk_create_students", { class_id: classId, students });
      setBulkText("");
      await load(classId);
      toast(`${students.length} student(s) added.`);
    } catch (e2) { toast(e2.message, "err"); } finally { setBusy(false); }
  }

  async function updateField(id, fields) {
    try { await call("update_student", { id, fields }); await load(classId); }
    catch (e) { toast(e.message, "err"); }
  }

  async function removeStudent(id) {
    if (!confirm("Remove this student and all their scores?")) return;
    try { await call("delete_student", { id }); await load(classId); toast("Student removed."); }
    catch (e) { toast(e.message, "err"); }
  }

  return (
    <div>
      <div className="pagehead">
        <h2>Students</h2>
        <p>Choose a class to manage its roster. Each student gets a permanent, unique ID the moment they're added.</p>
      </div>

      <div className="card">
        <label className="lbl" style={{ maxWidth: 360, marginBottom: 0 }}>Class
          <select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Choose a class…</option>
            {basicClasses.length > 0 && (
              <optgroup label="Basic / Nursery / KG">
                {basicClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            )}
            {secondaryClasses.length > 0 && (
              <optgroup label="Secondary / College">
                {secondaryClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            )}
          </select>
        </label>
      </div>

      {classId && (
        <>
          <div className="card">
            <h3>Add a student to {cls?.name}</h3>
            <form onSubmit={addOne} className="row">
              <input placeholder="Full name" value={newName} onChange={(e) => setNewName(e.target.value)} required />
              <select value={newSex} onChange={(e) => setNewSex(e.target.value)}>
                <option value="">Sex</option>
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
              <button className="btn btn-primary">Add</button>
            </form>
            <h4 style={{ marginBottom: 4, marginTop: 16 }}>Or add many at once</h4>
            <p className="hint" style={{ margin: "0 0 6px" }}>One student per line: Name, Sex (Sex optional)</p>
            <textarea rows={4} style={{ width: "100%" }} value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder={"Ahmad Bello, M\nFatima Yusuf, F"} />
            <div><button className="btn btn-primary" style={{ marginTop: 6 }} onClick={addBulk} disabled={busy}>{busy ? "Adding…" : "Add all"}</button></div>
          </div>

          <div className="card">
            <h3>Roster ({students.length})</h3>
            {!students.length ? <p className="empty">No students in this class yet.</p> : (
              <table className="datatable">
                <thead><tr><th>Student ID</th><th>Name</th><th>Sex</th><th>Admission No.</th><th>Class Teacher's Remark</th><th></th></tr></thead>
                <tbody>
                  {students.map((s) => (
                    <StudentRow key={s.id} s={s} onSave={updateField} onDelete={removeStudent} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StudentRow({ s, onSave, onDelete }) {
  const [name, setName] = useState(s.name);
  const [sex, setSex] = useState(s.sex || "");
  const [adm, setAdm] = useState(s.admission_no || "");
  const [remark, setRemark] = useState(s.class_teacher_remark || "");

  function commit() {
    onSave(s.id, { name, sex, admission_no: adm, class_teacher_remark: remark });
  }

  return (
    <tr>
      <td><code style={{ fontWeight: 700, color: "var(--navy)" }}>{s.student_code}</code></td>
      <td><input value={name} onChange={(e) => setName(e.target.value)} onBlur={commit} /></td>
      <td>
        <select value={sex} onChange={(e) => setSex(e.target.value)} onBlur={commit}>
          <option value="">-</option><option value="M">M</option><option value="F">F</option>
        </select>
      </td>
      <td><input value={adm} onChange={(e) => setAdm(e.target.value)} onBlur={commit} style={{ width: 100 }} /></td>
      <td><input value={remark} onChange={(e) => setRemark(e.target.value)} onBlur={commit} style={{ width: 220 }} /></td>
      <td><button className="btn btn-danger btn-sm" onClick={() => onDelete(s.id)}>Delete</button></td>
    </tr>
  );
}

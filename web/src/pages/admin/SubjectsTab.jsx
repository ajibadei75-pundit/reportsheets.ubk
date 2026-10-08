import { useEffect, useMemo, useState } from "react";
import { call } from "../../lib/api";
import { useToast } from "../../components/Toast";

export default function SubjectsTab({ subjects, classes, reload }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [section, setSection] = useState("basic");
  const [err, setErr] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [classSubjectIds, setClassSubjectIds] = useState([]);
  const [busy, setBusy] = useState(false);

  const cls = classes.find((c) => c.id === selectedClass);
  const basicSubjects = subjects.filter((s) => s.section === "basic");
  const secondarySubjects = subjects.filter((s) => s.section === "secondary");
  const optionsForClass = useMemo(() => subjects.filter((s) => s.section === cls?.section), [subjects, cls]);

  useEffect(() => {
    if (selectedClass) call("get_class_subjects", { class_id: selectedClass }).then((d) => setClassSubjectIds(d.subject_ids));
    else setClassSubjectIds([]);
  }, [selectedClass]);

  async function addSubject(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setErr("");
    try { await call("create_subject", { name: name.trim(), section }); setName(""); await reload(); }
    catch (e2) { setErr(e2.message); }
  }

  async function removeSubject(id) {
    if (!confirm("Delete this subject everywhere?")) return;
    await call("delete_subject", { id });
    await reload();
  }

  function toggle(id) {
    setClassSubjectIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function saveClassSubjects() {
    setBusy(true);
    try { await call("set_class_subjects", { class_id: selectedClass, subject_ids: classSubjectIds }); toast("Subjects saved for " + cls.name + "."); }
    catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }

  const List = ({ list }) => (
    !list.length ? <p className="hint">None yet.</p> :
    <table className="datatable"><tbody>
      {list.map((s) => <tr key={s.id}><td>{s.name}</td><td style={{ width: 1 }}><button className="btn btn-danger btn-sm" onClick={() => removeSubject(s.id)}>Delete</button></td></tr>)}
    </tbody></table>
  );

  return (
    <div>
      <div className="pagehead">
        <h2>Subjects</h2>
        <p>The Basic and Secondary sections each have their own subject list — a subject created for one section can never be added to the other, so the two sections' data always stay separate.</p>
      </div>

      <div className="card">
        <h3>Add a subject</h3>
        <form onSubmit={addSubject} className="row">
          <input placeholder="Subject name" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
          <select value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="basic">Basic / Nursery / KG</option>
            <option value="secondary">Secondary / College</option>
          </select>
          <button className="btn btn-primary">Add</button>
        </form>
        {err && <div className="err">{err}</div>}
        <div className="grid2" style={{ marginTop: 14 }}>
          <div><h4>Basic / Nursery / KG ({basicSubjects.length})</h4><List list={basicSubjects} /></div>
          <div><h4>Secondary / College ({secondarySubjects.length})</h4><List list={secondarySubjects} /></div>
        </div>
      </div>

      <div className="card">
        <h3>Which subjects does a class offer?</h3>
        <label className="lbl">Class
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
            <option value="">Choose a class…</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.section})</option>)}
          </select>
        </label>
        {selectedClass && (
          <>
            <p className="hint">Only {cls.section} subjects are offered here — this class cannot mix in the other section's subjects.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 6 }}>
              {optionsForClass.map((s) => (
                <label key={s.id} style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="checkbox" checked={classSubjectIds.includes(s.id)} onChange={() => toggle(s.id)} /> {s.name}
                </label>
              ))}
              {!optionsForClass.length && <p className="hint">No {cls.section} subjects exist yet — add some above.</p>}
            </div>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={saveClassSubjects} disabled={busy}>
              {busy ? "Saving…" : "Save subjects for this class"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

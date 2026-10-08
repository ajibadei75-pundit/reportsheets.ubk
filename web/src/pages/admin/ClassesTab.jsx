import { useState } from "react";
import { call } from "../../lib/api";

export default function ClassesTab({ classes, reload }) {
  const [name, setName] = useState("");
  const [section, setSection] = useState("basic");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const primary = classes.filter((c) => c.section === "basic");
  const secondary = classes.filter((c) => c.section === "secondary");

  async function add(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true); setErr("");
    try {
      await call("create_class", { name: name.trim(), section });
      setName("");
      await reload();
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }

  async function remove(id) {
    if (!confirm("Delete this class and all its students/scores?")) return;
    await call("delete_class", { id });
    await reload();
  }

  return (
    <div>
      <div className="pagehead">
        <h2>Classes</h2>
        <p>The school is organised into two sections: <b>Basic / Nursery / KG</b> (uses the primary report
        template) and <b>Secondary / College</b> (uses the J.S.S template).</p>
      </div>

      <div className="card">
        <h3>Add a class</h3>
        <form onSubmit={add} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input placeholder="e.g. Nursery 1, Primary 3, JSS 2" value={name} onChange={(e) => setName(e.target.value)} />
          <select value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="basic">Basic / Nursery / KG</option>
            <option value="secondary">Secondary / College</option>
          </select>
          <button className="btn btn-primary" disabled={busy}>Add class</button>
        </form>
        {err && <div className="err">{err}</div>}
      </div>

      <div className="grid2">
        <div className="card">
          <h3>Basic / Nursery / KG</h3>
          <ClassList list={primary} onDelete={remove} />
        </div>
        <div className="card">
          <h3>Secondary / College</h3>
          <ClassList list={secondary} onDelete={remove} />
        </div>
      </div>
    </div>
  );
}

function ClassList({ list, onDelete }) {
  if (!list.length) return <p style={{ color: "#999" }}>No classes yet.</p>;
  return (
    <table className="datatable">
      <thead><tr><th>Name</th><th></th></tr></thead>
      <tbody>
        {list.map((c) => (
          <tr key={c.id}>
            <td>{c.name}</td>
            <td><button className="btn btn-danger" onClick={() => onDelete(c.id)}>Delete</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

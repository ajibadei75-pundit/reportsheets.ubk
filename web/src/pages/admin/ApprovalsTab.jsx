import { useEffect, useState } from "react";
import { call } from "../../lib/api";
import { useToast } from "../../components/Toast";

export default function ApprovalsTab({ classes, go }) {
  const toast = useToast();
  const [approvals, setApprovals] = useState([]);

  async function load() {
    const d = await call("list_print_approvals");
    setApprovals(d.approvals || []);
  }
  useEffect(() => { load(); }, []);

  function statusFor(classId) {
    return approvals.find((x) => x.class_id === classId)?.status || "draft";
  }
  function noteFor(classId) {
    return approvals.find((x) => x.class_id === classId)?.admin_note || "";
  }
  function submittedAt(classId) {
    return approvals.find((x) => x.class_id === classId)?.submitted_at || null;
  }

  async function setStatus(classId, name, status) {
    let admin_note = null;
    if (status === "rejected") {
      admin_note = prompt("What should the class teacher fix?");
      if (admin_note === null) return;
    }
    await call("set_approval_status", { class_id: classId, status, admin_note });
    const messages = { approved: `${name} approved for printing.`, rejected: `${name} sent back to the class teacher.`, draft: `${name} reopened for editing.` };
    toast(messages[status] || "Updated.");
    await load();
  }

  function downloadClass(classId) {
    go?.("bulk");
  }

  const Group = ({ title, list }) => {
    const submitted = list.filter((c) => statusFor(c.id) === "submitted");
    const others = list.filter((c) => statusFor(c.id) !== "submitted");
    const ordered = [...submitted, ...others];
    return (
      <div className="card">
        <h3>{title} {submitted.length > 0 && <span className="badge submitted" style={{ marginLeft: 8 }}>{submitted.length} waiting</span>}</h3>
        {!list.length ? <p className="empty">No classes in this section yet.</p> : (
          <table className="datatable">
            <thead><tr><th>Class</th><th>Status</th><th>Submitted</th><th>Note</th><th></th></tr></thead>
            <tbody>
              {ordered.map((c) => {
                const status = statusFor(c.id);
                const when = submittedAt(c.id);
                return (
                  <tr key={c.id}>
                    <td><b>{c.name}</b></td>
                    <td><span className={`badge ${status}`}>{status === "submitted" ? "awaiting approval" : status}</span></td>
                    <td className="hint">{when ? new Date(when).toLocaleString() : "—"}</td>
                    <td>{noteFor(c.id)}</td>
                    <td className="row">
                      {status === "submitted" && <>
                        <button className="btn btn-primary btn-sm" onClick={() => setStatus(c.id, c.name, "approved")}>Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setStatus(c.id, c.name, "rejected")}>Send back</button>
                      </>}
                      {status === "approved" && <>
                        <button className="btn btn-sm" onClick={() => downloadClass(c.id)}>Download</button>
                        <button className="btn btn-sm" onClick={() => setStatus(c.id, c.name, "draft")}>Reopen</button>
                      </>}
                      {status === "draft" && <span className="hint">Waiting on the class teacher</span>}
                      {status === "rejected" && <span className="hint">Returned — waiting on the class teacher</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="pagehead">
        <h2>Print Approvals</h2>
        <p>Class teachers submit a class here once they've filled everything and previewed each result. Approve to lock it for printing, or send it back with a note so they can fix it.</p>
      </div>
      <Group title="Basic / Nursery / KG" list={classes.filter((c) => c.section === "basic")} />
      <Group title="Secondary / College" list={classes.filter((c) => c.section === "secondary")} />
    </div>
  );
}

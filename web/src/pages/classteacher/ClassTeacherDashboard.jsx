import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { call } from "../../lib/api";
import RosterFillPrimary from "./RosterFillPrimary";
import RosterFillSecondary from "./RosterFillSecondary";
import ClassPreview from "./ClassPreview";
import SignatureUpload from "./SignatureUpload";

export default function ClassTeacherDashboard() {
  const { classes } = useAuth();
  const [classId, setClassId] = useState(classes?.[0]?.id || "");
  const [tab, setTab] = useState("fill");
  
  const cls = (classes || []).find((c) => c.id === classId);

  useEffect(() => {
    // If the selected class isn't one of this teacher's classes (e.g. stale
    // from a previous session), fall back to their first class.
    if (classes?.length && !classes.some((c) => c.id === classId)) setClassId(classes[0].id);
  }, [classes, classId]);

  if (!classes || !classes.length) {
    return <div className="content"><p>You are not yet assigned to a class. Please contact the admin.</p></div>;
  }

  return (
    <div className="layout">
      <div className="sidebar">
        {classes.length > 1 && (
          <div style={{ padding: "0 16px 10px" }}>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} style={{ width: "100%" }}>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <button className={"navlink" + (tab === "fill" ? " active" : "")} onClick={() => setTab("fill")}>Fill Results</button>
        <button className={"navlink" + (tab === "preview" ? " active" : "")} onClick={() => setTab("preview")}>Preview &amp; Submit</button>
        <button className={"navlink" + (tab === "signature" ? " active" : "")} onClick={() => setTab("signature")}>My Signature</button>
      </div>
      <div className="content">
        <div className="pagehead"><h2>{cls?.name}</h2><p>{cls?.section === "basic" ? "You fill everything for this class: scores, attendance, affective domain and comments." : "Subject teachers enter the scores. You add attendance, skills, behaviour and comments."}</p></div>
        {cls && tab === "fill" && (
          cls.section === "basic"
            ? <RosterFillPrimary classId={classId} />
            : <RosterFillSecondary classId={classId} />
        )}
        {cls && tab === "preview" && <ClassPreview classId={classId} onGoSignature={() => setTab("signature")} />}
        {tab === "signature" && <SignatureUpload />}
      </div>
    </div>
  );
}

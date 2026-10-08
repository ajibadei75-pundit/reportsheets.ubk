import { useEffect, useState } from "react";
import { call } from "../../lib/api";
import ReportCardSecondary from "../../components/ReportCardSecondary";
import ReportCardPrimary from "../../components/ReportCardPrimary";
import ReportBatchExporter from "../../components/ReportBatchExporter";
import StudentNav from "../../components/StudentNav";
import { missingFor } from "../../lib/completeness";
import { useToast } from "../../components/Toast";

export default function ClassPreview({ classId, onGoSignature }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  async function load() {
    try { setData(await call("get_class_roster", { class_id: classId })); setLoadErr(""); }
    catch (e) { setLoadErr(e.message); }
  }
  useEffect(() => { setData(null); setIdx(0); load(); }, [classId]);

  if (loadErr) return <div className="banner bad"><b>Couldn't load this class.</b> {loadErr} <button className="linkbtn" onClick={load}>Try again</button></div>;
  if (!data) return <p>Loading…</p>;
  if (!data.reports.length) return <div className="card empty">No students in this class yet. Ask the admin to add them.</div>;

  const Template = data.class.section === "secondary" ? ReportCardSecondary : ReportCardPrimary;
  const report = data.reports[idx];
  const missingSig = !data.classTeacherProfile?.signature_url;
  const incomplete = data.reports.filter((r) => missingFor(r, data.class.section).length).length;
  const status = data.approval?.status || "draft";
  const locked = status === "submitted" || status === "approved";

  async function submit() {
    const warn = incomplete ? `${incomplete} student(s) still have missing information.\n\n` : "";
    if (!confirm(`${warn}Submit ${data.class.name} to the admin for printing?`)) return;
    setBusy(true);
    try { await call("submit_for_printing", { class_id: classId }); toast("Submitted to the admin for printing."); await load(); }
    catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }

  return (
    <div>
      {status === "approved" && <div className="banner ok"><b>Approved.</b> The admin can now print this class.</div>}
      {status === "submitted" && <div className="banner warn"><b>Submitted.</b> Waiting for the admin to approve. You can still preview, but please avoid editing.</div>}
      {status === "rejected" && <div className="banner bad"><b>Sent back by the admin.</b> {data.approval?.admin_note || "Please review and submit again."}</div>}
      {missingSig && <div className="banner warn">You haven't uploaded your signature yet. <button className="linkbtn" onClick={onGoSignature}>Upload it now</button></div>}

      <StudentNav data={data} idx={idx} setIdx={setIdx} />

      <div className="card row">
        <ReportBatchExporter data={data} buttonLabel="Download class PDF" />
        <span style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={submit} disabled={busy || locked}>
          {locked ? (status === "approved" ? "Approved ✓" : "Submitted ✓") : busy ? "Submitting…" : "Submit for printing"}
        </button>
      </div>
      {incomplete > 0 && !locked && <p className="hint">{incomplete} student(s) are incomplete. You can still submit, but the sheets will print with blanks.</p>}

      <div className="preview-scroll">
        <Template report={report} cls={data.class} settings={data.settings} classTeacher={data.classTeacherProfile} />
      </div>
    </div>
  );
}

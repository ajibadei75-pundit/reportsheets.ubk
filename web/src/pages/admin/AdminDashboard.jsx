import { useEffect, useState } from "react";
import { call } from "../../lib/api";
import OverviewTab from "./OverviewTab";
import ClassesTab from "./ClassesTab";
import SubjectsTab from "./SubjectsTab";
import TeachersTab from "./TeachersTab";
import StudentsTab from "./StudentsTab";
import SettingsTab from "./SettingsTab";
import GradingTab from "./GradingTab";
import ApprovalsTab from "./ApprovalsTab";
import BulkDownloadTab from "./BulkDownloadTab";

const TABS = [
  ["overview", "Overview"],
  ["classes", "Classes"],
  ["subjects", "Subjects"],
  ["teachers", "Teachers"],
  ["students", "Students"],
  ["approvals", "Approvals"],
  ["bulk", "Bulk Download"],
  ["grading", "Grading Scale"],
  ["settings", "School Settings"],
];

export default function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [pending, setPending] = useState(0);

  async function reload() {
    // Independent try/catches: one failing call (e.g. a transient network
    // blip) should never stop the other two from loading.
    try { setClasses((await call("list_classes")).classes || []); } catch { /* keep previous list */ }
    try { setSubjects((await call("list_subjects")).subjects || []); } catch { /* keep previous list */ }
    try { setPending(((await call("list_print_approvals")).approvals || []).filter((x) => x.status === "submitted").length); } catch { /* badge just won't update */ }
  }
  useEffect(() => { reload(); }, [tab]);

  const shared = { classes, subjects, reload };

  return (
    <div className="layout">
      <div className="sidebar">
        {TABS.map(([id, label]) => (
          <button key={id} className={"navlink" + (tab === id ? " active" : "")} onClick={() => setTab(id)}>
            {label}
            {id === "approvals" && pending > 0 && <span className="dot">{pending}</span>}
          </button>
        ))}
      </div>
      <div className="content">
        {tab === "overview" && <OverviewTab go={setTab} />}
        {tab === "classes" && <ClassesTab {...shared} />}
        {tab === "subjects" && <SubjectsTab {...shared} />}
        {tab === "teachers" && <TeachersTab {...shared} />}
        {tab === "students" && <StudentsTab {...shared} />}
        {tab === "approvals" && <ApprovalsTab {...shared} go={setTab} />}
        {tab === "bulk" && <BulkDownloadTab {...shared} />}
        {tab === "grading" && <GradingTab {...shared} />}
        {tab === "settings" && <SettingsTab {...shared} />}
      </div>
    </div>
  );
}

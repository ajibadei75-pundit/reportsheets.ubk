import { useState } from "react";
import { call } from "../../lib/api";
import ReportBatchExporter from "../../components/ReportBatchExporter";
import SectionBatchExporter from "../../components/SectionBatchExporter";
import { useToast } from "../../components/Toast";

export default function BulkDownloadTab({ classes }) {
  const toast = useToast();
  const [classId, setClassId] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sectionLoading, setSectionLoading] = useState(null); // "basic" | "secondary" | null
  const [sectionData, setSectionData] = useState({ basic: null, secondary: null });

  const basicClasses = classes.filter((c) => c.section === "basic");
  const secondaryClasses = classes.filter((c) => c.section === "secondary");

  async function loadClass(id) {
    setClassId(id);
    setData(null);
    if (!id) return;
    setLoading(true);
    try {
      const d = await call("get_class_report_data", { class_id: id });
      setData(d);
    } catch (e) {
      toast(e.message, "err");
    } finally {
      setLoading(false);
    }
  }

  async function loadSection(section) {
    const list = section === "basic" ? basicClasses : secondaryClasses;
    if (!list.length) return;
    setSectionLoading(section);
    try {
      const results = [];
      for (const c of list) {
        try {
          results.push(await call("get_class_report_data", { class_id: c.id }));
        } catch (e) {
          toast(`Skipped ${c.name}: ${e.message}`, "err");
        }
      }
      setSectionData((s) => ({ ...s, [section]: results }));
    } finally {
      setSectionLoading(null);
    }
  }

  const SectionBlock = ({ section, label, list }) => {
    const loaded = sectionData[section];
    return (
      <div className="card">
        <h3>{label}</h3>
        {!list.length ? (
          <p className="empty">No classes in this section yet.</p>
        ) : !loaded ? (
          <>
            <p className="hint">{list.length} class(es): {list.map((c) => c.name).join(", ")}.</p>
            <button className="btn" onClick={() => loadSection(section)} disabled={sectionLoading === section}>
              {sectionLoading === section ? "Loading all classes…" : `Prepare whole-section download`}
            </button>
          </>
        ) : (
          <>
            <p className="hint">Loaded {loaded.length} of {list.length} class(es) — {loaded.reduce((n, d) => n + d.reports.length, 0)} students total.</p>
            <SectionBatchExporter sectionLabel={label} classDatas={loaded} />
          </>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="pagehead">
        <h2>Bulk Download</h2>
        <p>Download one class as a single PDF, or combine an entire section's classes into one print-ready file.</p>
      </div>

      <div className="card">
        <h3>One class at a time</h3>
        <label className="lbl" style={{ maxWidth: 360 }}>Class
          <select value={classId} onChange={(e) => loadClass(e.target.value)}>
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

        {loading && <p>Loading class data…</p>}
        {data && (
          <div style={{ marginTop: 14 }}>
            <p>{data.reports.length} student(s) in {data.class.name}
              {data.approval?.status && <span className={`badge ${data.approval.status}`} style={{ marginLeft: 8 }}>{data.approval.status}</span>}
            </p>
            <ReportBatchExporter data={data} buttonLabel={`Download all ${data.reports.length} results (PDF)`} />
          </div>
        )}
      </div>

      <div className="pagehead" style={{ marginTop: 4 }}>
        <h3 style={{ marginBottom: 2 }}>Whole section at once</h3>
        <p className="hint">Combines every class in the section into a single PDF, class by class, ready to send to the printer in one go.</p>
      </div>
      <SectionBlock section="basic" label="Basic / Nursery / KG" list={basicClasses} />
      <SectionBlock section="secondary" label="Secondary / College" list={secondaryClasses} />
    </div>
  );
}

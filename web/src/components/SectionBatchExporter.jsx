import { useRef, useState } from "react";
import ReportCardSecondary from "./ReportCardSecondary";
import ReportCardPrimary from "./ReportCardPrimary";
import { exportNodesToPdf } from "../lib/exportPdf";
import { useToast } from "./Toast";

// classDatas: array of { class, settings, reports, classTeacherProfile } — one
// per class, all from the same section. Produces ONE PDF with every class's
// students back to back, in the order given (e.g. Nursery 1, Nursery 2, KG 1…).
export default function SectionBatchExporter({ sectionLabel, classDatas, buttonLabel }) {
  const containerRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const totalStudents = classDatas.reduce((n, d) => n + (d.reports?.length || 0), 0);
  const label = buttonLabel || `Download whole section — ${totalStudents} result(s) across ${classDatas.length} class(es)`;

  async function handleExport() {
    setBusy(true);
    try {
      const nodes = Array.from(containerRef.current.querySelectorAll(".report-page"));
      if (!nodes.length) { toast("No students to export yet.", "err"); return; }
      const term = (classDatas[0]?.settings?.term || "term").replace(/[^a-z0-9]+/gi, "-");
      const safeSection = (sectionLabel || "section").replace(/[^a-z0-9]+/gi, "-");
      await exportNodesToPdf(nodes, `${safeSection}-${term}-all-results.pdf`);
      toast(`PDF downloaded — ${nodes.length} report(s).`);
    } catch (e) {
      toast("Could not generate the PDF: " + e.message, "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="btn btn-primary" onClick={handleExport} disabled={busy || !totalStudents}>
        {busy ? `Preparing PDF… (${totalStudents} reports, this can take a moment)` : label}
      </button>
      <div style={{ position: "absolute", left: -99999, top: 0 }} ref={containerRef}>
        {classDatas.map((data) => {
          const Template = data.class?.section === "secondary" ? ReportCardSecondary : ReportCardPrimary;
          return (data.reports || []).map((r) => (
            <Template
              key={`${data.class.id}-${r.student.id}`}
              report={r}
              cls={data.class}
              settings={data.settings}
              classTeacher={data.classTeacherProfile}
            />
          ));
        })}
      </div>
    </div>
  );
}

import { useRef, useState } from "react";
import ReportCardSecondary from "./ReportCardSecondary";
import ReportCardPrimary from "./ReportCardPrimary";
import { exportNodesToPdf } from "../lib/exportPdf";
import { useToast } from "./Toast";

// data: result of get_class_report_data / get_class_roster -> { class, settings, reports, classTeacherProfile }
export default function ReportBatchExporter({ data, buttonLabel = "Download All (PDF)" }) {
  const containerRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const isSecondary = data.class?.section === "secondary";
  const Template = isSecondary ? ReportCardSecondary : ReportCardPrimary;

  async function handleExport() {
    setBusy(true);
    try {
      const nodes = Array.from(containerRef.current.querySelectorAll(".report-page"));
      const safeName = (data.class?.name || "class").replace(/[^a-z0-9]+/gi, "-");
      const term = (data.settings?.term || "term").replace(/[^a-z0-9]+/gi, "-");
      await exportNodesToPdf(nodes, `${safeName}-${term}-results.pdf`);
      toast("PDF downloaded.");
    } catch (e) {
      toast("Could not generate the PDF: " + e.message, "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="btn btn-primary" onClick={handleExport} disabled={busy || !data.reports?.length}>
        {busy ? "Preparing PDF…" : buttonLabel}
      </button>
      <div style={{ position: "absolute", left: -99999, top: 0 }} ref={containerRef}>
        {data.reports.map((r) => (
          <Template
            key={r.student.id}
            report={r}
            cls={data.class}
            settings={data.settings}
            classTeacher={data.classTeacherProfile}
          />
        ))}
      </div>
    </div>
  );
}

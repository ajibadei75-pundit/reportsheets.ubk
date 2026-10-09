import { AFFECTIVE } from "../components/ReportCardPrimary";
import { SKILLS, BEHAVIOUR } from "../components/ReportCardSecondary";

// Returns a list of things still missing for one student's report (empty list = complete)
export function missingFor(report, section) {
  const s = report.student;
  const missing = [];
  const noScores = report.rows.filter((r) => r.exam == null).length;
  if (noScores) missing.push(`${noScores} subject score${noScores > 1 ? "s" : ""}`);
  if (section === "basic") {
    const b = s.behaviour || {};
    if (AFFECTIVE.some((k) => !b[k])) missing.push("affective domain");
    if (!s.max_attendance || !s.time_present) missing.push("attendance");
  } else {
    if (SKILLS.some((k) => !(s.skills || {})[k])) missing.push("skills");
    if (BEHAVIOUR.some((k) => !(s.behaviour || {})[k])) missing.push("behaviour");
    if (!s.time_present) missing.push("time present");
  }
  if (!s.class_teacher_remark) missing.push("comment");
  return missing;
}

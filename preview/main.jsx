import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "../src/index.css";
import { exportNodesToPdf } from "../src/lib/exportPdf";
import ReportCardPrimary from "../src/components/ReportCardPrimary";
import ReportCardSecondary from "../src/components/ReportCardSecondary";

const settings = { school_name: "UMAR BN L KHATTOB CENTER", term: "First Term", session: "2025/2026", next_term_begins: "2026-01-12", time_school_opened: "62" };
const ord = (n) => n + (["th","st","nd","rd"][(n % 100 - 20) % 10] || ["th","st","nd","rd"][n % 100] || "th");
function build(names, kind) {
  let seed = kind === "p" ? 7 : 3;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const rows = names.map((n, i) => {
    const first_ca = kind === "p" ? Math.round(20 + rnd() * 20) : Math.round(8 + rnd() * 12);
    const second_ca = kind === "p" ? null : Math.round(8 + rnd() * 12);
    const exam = kind === "p" ? Math.round(30 + rnd() * 30) : Math.round(25 + rnd() * 35);
    const total = first_ca + (second_ca || 0) + exam;
    const grade = total >= 75 ? "A" : total >= 60 ? "B" : total >= 50 ? "C" : total >= 40 ? "D" : "F";
    return { subject_id: i, subject_name: n, first_ca, second_ca, exam, total, grade,
      remark: total >= 75 ? "Excellent" : total >= 60 ? "Very Good" : total >= 50 ? "Good" : "Fair",
      position: ord(1 + Math.floor(rnd() * 12)), class_max: Math.min(100, total + 8), class_min: Math.max(20, total - 25), tutor_sign: "" };
  });
  const got = rows.reduce((a, r) => a + r.total, 0);
  return { overallGrade: "B", rows, totalObtained: got, totalObtainable: rows.length * 100, percentage: (got / rows.length).toFixed(1), overallPosition: "3rd", noInClass: 28 };
}
const PRIMARY = ["Mathematics","English Studies","Verbal Reasoning","Quantitative Reasoning","Basic Science & Technology","Social Habit","Health Habit","Islamic Studies","Home Economics","Yoruba","Computer","Arabic","Qur'an","Hand Writing","Creative Art","Phonics","Literature","Civic","P.H.E"];
const SECONDARY = ["English Language","Mathematics","Basic Science","Basic Technology","Physical & Health Education","Information Communication Technology","Social Studies","Civic Education","Security Education","Business Studies","Home Economics","History","Islamic & Religious Studies","Agricultural Sciences","Arabic","Qur'an"];
const SK = ["Hand Writing","Fluency","Games","Sports","Gymnastic","Handling of tools in Lab. & Worship","Drawing & Painting","Crafts","Musical Skills"];
const BE = ["Punctuality","Attendance at Class","Reliability","Neatness","Politeness","Honesty","Relationship with other Students","Relationship with Staff","Self Control","Spirit of Cooperation","Sense of Responsibility","Attentiveness","Initiative","Organizational Ability","Perseverance"];
const AF = ["Punctuality","Neatness","Politeness","Honesty","Cooperation with Others","Helping Others","Attitude to School Work","Attentiveness"];

const pRep = { ...build(PRIMARY, "p"), student: { name: "Aisha Abdullahi Bello", student_code: "UBK-00042", max_attendance: "62", time_present: "58", weight: "24 kg", height: "118 cm", class_teacher_remark: "A hardworking and respectful pupil. Keep it up.", behaviour: Object.fromEntries(AF.map((k, i) => [k, 5 - (i % 3)])) } };
const sRep = { ...build(SECONDARY, "s"), student: { name: "Ibrahim Yusuf Adeyemi", student_code: "UBK-00089", sex: "M", time_present: "60", class_teacher_remark: "Good performance. He should improve in Mathematics.", skills: Object.fromEntries(SK.map((k, i) => [k, "ABC"[i % 3]])), behaviour: Object.fromEntries(BE.map((k, i) => [k, "ABC"[i % 3]])) } };
const ct = { full_name: "Mrs. Sample Teacher", signature_url: null };

const blank = (rep, names) => ({ rows: names.map((n, i) => ({ subject_id: i, subject_name: n })), student: {}, totalObtained: "", totalObtainable: "", percentage: "", noInClass: "", overallGrade: "" });
const pBlank = blank(pRep, PRIMARY), sBlank = blank(sRep, SECONDARY);

function App() {
  const [tab, setTab] = useState("p");
  const [isBlank, setBlank] = useState(false);
  async function dl() {
    const old = zoom; setZoom(1);
    await new Promise((r) => setTimeout(r, 300));
    try { await exportNodesToPdf(Array.from(document.querySelectorAll(".report-page")), tab === "p" ? "primary-sample.pdf" : "secondary-sample.pdf"); }
    finally { setZoom(old); }
  }
  const [zoom, setZoom] = useState(Math.min(1, (window.innerWidth - 24) / 794));
  useEffect(() => { const f = () => setZoom(Math.min(1, (window.innerWidth - 24) / 794)); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return (
    <div style={{ background: "#ddd", minHeight: "100vh", padding: 12 }}>
      <div className="tabs" style={{ justifyContent: "center" }}>
        <button className={tab === "p" ? "active" : ""} onClick={() => setTab("p")}>Nursery / KG / Primary sheet</button>
        <button className={tab === "s" ? "active" : ""} onClick={() => setTab("s")}>Secondary (J.S.S) sheet</button>
      </div>
      <p style={{ textAlign: "center", fontSize: 12, color: "#444" }}><label><input type="checkbox" checked={isBlank} onChange={(e) => setBlank(e.target.checked)} /> Show blank form (to compare with the paper)</label> · <button className="btn" id="dl" onClick={dl}>Download this sheet as PDF (test)</button> · sample data only · A4 210 x 297 mm</p>
      <div style={{ zoom }}>
        {tab === "p"
          ? <ReportCardPrimary report={isBlank ? pBlank : pRep} cls={{ name: "Primary 3" }} settings={settings} classTeacher={ct} />
          : <ReportCardSecondary report={isBlank ? sBlank : sRep} cls={{ name: "JSS 1" }} settings={settings} classTeacher={ct} />}
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);

import logo from "../assets/logo.jpg";
import "./fonts";
import "./report.css";
import { shortDate } from "../lib/dates";

export const SKILLS = [
  "Hand Writing", "Fluency", "Games", "Sports", "Gymnastic",
  "Handling of tools in Lab. & Worship", "Drawing & Painting", "Crafts", "Musical Skills",
];
export const BEHAVIOUR = [
  "Punctuality", "Attendance at Class", "Reliability", "Neatness", "Politeness", "Honesty",
  "Relationship with other Students", "Relationship with Staff", "Self Control",
  "Spirit of Cooperation", "Sense of Responsibility", "Attentiveness", "Initiative",
  "Organizational Ability", "Perseverance",
];
const MIN_ROWS = 16;
const BODY_MM = 158;   // fixed body height => both tables always end together and the page fits A4

const F = ({ l, v, long }) => (
  <div className="rf"><span className="rf-l">{l}</span><span className={"rf-v dot" + (long ? " long" : "")}>{v ?? ""}</span></div>
);
const FL = ({ l, v, w }) => (
  <div className="rf" style={w ? { width: w } : undefined}><span className="rf-l">{l}</span><span className="rf-v">{v ?? ""}</span></div>
);

export default function ReportCardSecondary({ report, cls, settings, classTeacher }) {
  const s = report.student;
  const skills = s.skills || {};
  const behaviour = s.behaviour || {};
  const n = Math.max(MIN_ROWS, report.rows.length);
  const rowH = `${BODY_MM / n}mm`;
  const blanks = n - report.rows.length;
  const rightH = `${BODY_MM / 25}mm`;

  return (
    <div className="report-page">
      <div className="rs-head">
        <img src={logo} className="rs-logo" alt="" />
        <div className="rs-htext">
          <div className="rs-ar">مركز عمر بن الخطاب</div>
          <div className="rs-title">{settings?.school_name || "UMAR BN L KHATTOB CENTER"}</div>
          <div className="rs-col">UMAR BN L KHATTOB COLLEGE</div>
          <div className="rs-addr">Abaa Area Ogbomoso &middot; ID: {s.student_code}</div>
          <div className="rs-pill">J.S.S. STATEMENT OF RESULT</div>
        </div>
      </div>

      <div className="rs-fields">
        <div style={{ gridColumn: "1 / span 2" }}><F l="Name of Student" v={s.name} /></div>
        <F l="Grade" v={report.overallGrade} />
        <F l="Class" v={cls?.name} /><F l="Sex" v={s.sex} /><F l="No. in Class" v={report.noInClass} />
        <F l="Time School Opened" v={settings?.time_school_opened} /><F l="Time Present" v={s.time_present} />
        <F l="Next Term Begins" v={shortDate(settings?.next_term_begins)} long />
      </div>

      <div className="rs-main">
        <table className="rs-left">
          <colgroup>
            <col style={{ width: "31%" }} />
            {Array.from({ length: 8 }).map((_, i) => <col key={i} style={{ width: "8.6%" }} />)}
          </colgroup>
          <thead>
            <tr style={{ height: "11mm" }}>
              <th className="sj">Subjects</th>
              <th>1st C.A</th><th>2nd C.A</th><th>Term's<br />Exam</th><th>Sum of<br />Term Work</th>
              <th>Grade</th><th>Position</th><th>Expected<br />Score</th><th>Tutor's<br />Sign</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r) => (
              <tr key={r.subject_id} style={{ height: rowH }}>
                <td className="sn">{r.subject_name}</td>
                <td>{r.first_ca ?? ""}</td><td>{r.second_ca ?? ""}</td><td>{r.exam ?? ""}</td><td>{r.total ?? ""}</td>
                <td>{r.grade}</td><td>{r.position}</td><td>{r.total == null ? "" : 100}</td><td>{r.tutor_sign}</td>
              </tr>
            ))}
            {Array.from({ length: blanks }).map((_, i) => (
              <tr key={"b" + i} style={{ height: rowH }}>{Array.from({ length: 9 }).map((__, j) => <td key={j} />)}</tr>
            ))}
          </tbody>
        </table>

        <table className="rs-right">
          <colgroup><col style={{ width: "86%" }} /><col style={{ width: "14%" }} /></colgroup>
          <thead>
            <tr style={{ height: "11mm" }}><th colSpan={2}><b>SKILLS</b> (See rating below)</th></tr>
          </thead>
          <tbody>
            {SKILLS.map((k, i) => (
              <tr key={k} style={{ height: rightH }}><td>{i + 1}. {k}</td><td className="bx">{skills[k] || ""}</td></tr>
            ))}
            <tr style={{ height: rightH }}><td colSpan={2} className="bh">BEHAVIOUR <small>(See rating below)</small></td></tr>
            {BEHAVIOUR.map((k, i) => (
              <tr key={k} style={{ height: rightH }}><td>{i + 1}. {k}</td><td className="bx">{behaviour[k] || ""}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rs-foot">
        <div className="rs-fl">
          <div className="rs-tots"><FL l="Total Mark Obtainable" v={report.totalObtainable} /><FL l="Total Mark Obtained" v={report.totalObtained} /></div>
          <FL l="Percentage" v={report.percentage ? report.percentage + "%" : ""} />
          <div className="rs-rem">
            <div className="rl" style={{ top: "6.2mm" }} /><div className="rl" style={{ top: "12.7mm" }} />
            <span className="sgn"><span>Sign</span><i />{classTeacher?.signature_url && <img src={classTeacher.signature_url} alt="" crossOrigin="anonymous" />}</span>
            <p>Class Teacher's Remark: <span className="rt">{s.class_teacher_remark || ""}</span></p>
          </div>
          <div className="rs-rem">
            <div className="rl" style={{ top: "6.2mm" }} /><div className="rl" style={{ top: "12.7mm" }} />
            <span className="sgn"><span>Sign</span><i /></span>
            <p>Principal's Remarks:</p>
          </div>
        </div>
        <div className="rs-fr">
          <div className="kt">Key to Rating</div>
          A. Maintenance an excellent degree of observable traits.<br />
          B. Maintains High Level of Observable traits.<br />
          C. Acceptance Level of Observable traits<br />
          D. Show Minimal regard for Observable traits.<br />
          E. Has no regard for the Observable traits.
        </div>
      </div>
    </div>
  );
}

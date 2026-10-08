import logo from "../assets/logo.jpg";
import "./fonts";
import "./report.css";
import { longDate } from "../lib/dates";

export const AFFECTIVE = [
  "Punctuality", "Neatness", "Politeness", "Honesty",
  "Cooperation with Others", "Helping Others", "Attitude to School Work", "Attentiveness",
];
const MIN_ROWS = 21;      // 19 subjects + 2 blank rows, as on the paper form
const BODY_MM = 117.6;    // fixed height of the table body so the page always fits A4
const PITCH = 6.4;        // line pitch (mm) for the comment lines

const F = ({ l, v }) => (
  <div className="rf"><span className="rf-l">{l}</span><span className="rf-v">{v ?? ""}</span></div>
);

function Ruled({ label, text, lines, sig }) {
  return (
    <div className="ruled" style={{ height: `${lines * PITCH}mm` }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="rl" style={{ top: `${(i + 1) * PITCH - 0.35}mm` }} />
      ))}
      <p style={{ lineHeight: `${PITCH}mm` }}>{label} <span className="rt">{text}</span></p>
    </div>
  );
}

export default function ReportCardPrimary({ report, cls, settings, classTeacher }) {
  const s = report.student;
  const aff = s.behaviour || {};
  const n = Math.max(MIN_ROWS, report.rows.length);
  const rowH = `${BODY_MM / n}mm`;
  const blanks = n - report.rows.length;
  const termWord = (settings?.term || "").replace(/\s*term\s*$/i, "");
  const ca = (r) => (r.first_ca == null && r.second_ca == null ? "" : (Number(r.first_ca) || 0) + (Number(r.second_ca) || 0));

  return (
    <div className="report-page">
      <div className="rp-head">
        <img src={logo} className="rp-logo" alt="" />
        <div className="rp-htext">
          <div className="rp-title">UMAR BN L KHATTOB</div>
          <div className="rp-sub">NURSERY &amp; PRIMARY SCHOOL</div>
          <div className="rp-addr">Abaa area Ogbomoso</div>
          <div className="rp-addr" style={{ fontSize: "8pt", marginTop: "1mm" }}>Student ID: <b>{s.student_code}</b></div>
        </div>
      </div>

      <div className="rp-box1">
        <div className="rp-tab"><span className="rf-v">{termWord}</span><b>TERM</b></div>
        <div className="rp-row" style={{ gridTemplateColumns: "51fr 27fr 22fr" }}>
          <F l="NAME:" v={s.name} /><F l="FROM:" v="" /><F l="TO:" v="" />
        </div>
        <div className="rp-row" style={{ gridTemplateColumns: "47fr 53fr" }}>
          <F l="MAXIMUM ATTENDANCE:" v={s.max_attendance} /><F l="NO. OF TIME PRESENT:" v={s.time_present} />
        </div>
        <div className="rp-row" style={{ gridTemplateColumns: "34fr 34fr 32fr" }}>
          <F l="CLASS:" v={cls?.name} /><F l="NO. IN CLASS:" v={report.noInClass} /><F l="GRADE:" v={report.overallGrade} />
        </div>
      </div>

      <div className="rp-box2">
        <div className="rp-wh"><F l="Weight" v={s.weight} /><F l="Height" v={s.height} /></div>

        <table className="rp-table">
          <colgroup>
            <col style={{ width: "31.8%" }} /><col style={{ width: "7.4%" }} /><col style={{ width: "7.4%" }} />
            <col style={{ width: "7.2%" }} /><col style={{ width: "7.2%" }} /><col style={{ width: "7.2%" }} />
            <col style={{ width: "7.2%" }} /><col style={{ width: "7.2%" }} /><col style={{ width: "17.2%" }} />
          </colgroup>
          <thead>
            <tr style={{ height: "8mm" }}>
              <th className="sj">SUBJECTS</th>
              <th>Contn.<br />Assess</th><th>Exam</th><th>Total<br />Score</th>
              <th>Max. Score<br />in Class</th><th>Min. Score<br />in Class</th>
              <th>Grade</th><th>Position</th><th className="rm">Remark</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r) => (
              <tr key={r.subject_id} style={{ height: rowH }}>
                <td className="sn">{r.subject_name}</td>
                <td>{ca(r)}</td><td>{r.exam ?? ""}</td><td>{r.total ?? ""}</td>
                <td>{r.class_max ?? ""}</td><td>{r.class_min ?? ""}</td>
                <td>{r.grade}</td><td>{r.position}</td><td className="rk">{r.remark}</td>
              </tr>
            ))}
            {Array.from({ length: blanks }).map((_, i) => (
              <tr key={"b" + i} style={{ height: rowH }}>
                {Array.from({ length: 9 }).map((__, j) => <td key={j} />)}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="rp-foot">
          <div className="rp-tot">
            <F l="Total Mark Obtainable" v={report.totalObtainable} />
            <F l="Total Mark Obtained" v={report.totalObtained} />
            <F l="Percentage" v={report.percentage ? report.percentage + "%" : ""} />
          </div>
          <div className="rp-lower">
            <div className="rp-left">
              <Ruled label="Class Teacher's Comment:" text={s.class_teacher_remark || ""} lines={3} />
              <div className="rf" style={{ width: "62%", position: "relative", height: `${PITCH}mm`, alignItems: "flex-end" }}>
                <span className="rf-l">Signature</span><span className="rf-v" />
                {classTeacher?.signature_url && <img className="sigimg" src={classTeacher.signature_url} alt="" crossOrigin="anonymous" style={{ left: "24mm", bottom: ".8mm" }} />}
              </div>
              <Ruled label="Head Mistress's Comment:" text="" lines={4} />
              <F l="Signature & School Stamp:" v="" />
              <F l="Next Term Begins:" v={longDate(settings?.next_term_begins)} />
            </div>
            <table className="rp-aff">
              <colgroup><col style={{ width: "40mm" }} />{[5,4,3,2,1].map((k) => <col key={k} />)}</colgroup>
              <thead><tr><th>AFFECTIVE DOMAIN</th>{[5,4,3,2,1].map((k) => <th key={k} className="n">{k}</th>)}</tr></thead>
              <tbody>
                {AFFECTIVE.map((k) => (
                  <tr key={k}>
                    <td>{k}</td>
                    {[5,4,3,2,1].map((v) => <td key={v} className="c">{Number(aff[k]) === v ? "✓" : ""}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

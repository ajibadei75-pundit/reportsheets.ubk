import { missingFor } from "../lib/completeness";

export default function StudentNav({ data, idx, setIdx }) {
  const section = data.class.section;
  const status = data.reports.map((r) => missingFor(r, section));
  const n = data.reports.length;
  const done = status.filter((m) => !m.length).length;
  const pct = Math.round((done / n) * 100);
  const cur = status[idx] || [];
  return (
    <div className="card">
      <div className="picker">
        <button className="btn" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>← Prev</button>
        <select value={idx} onChange={(e) => setIdx(Number(e.target.value))} aria-label="Choose student">
          {data.reports.map((r, i) => <option key={r.student.id} value={i}>{status[i].length ? "○" : "✓"} {i + 1}. {r.student.name}</option>)}
        </select>
        <button className="btn" disabled={idx === n - 1} onClick={() => setIdx(idx + 1)}>Next →</button>
      </div>
      <div style={{ marginTop: 10 }}>
        <div className={"progress" + (pct === 100 ? " full" : "")}><i style={{ width: pct + "%" }} /></div>
        <span className="hint">
          {done} of {n} students complete · {cur.length ? `${data.reports[idx].student.name} still needs: ${cur.join(", ")}` : "this student is complete ✓"}
        </span>
      </div>
    </div>
  );
}

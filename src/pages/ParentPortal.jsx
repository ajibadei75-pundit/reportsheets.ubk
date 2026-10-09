import { useEffect, useRef, useState } from "react";
import { call } from "../lib/api";
import ReportCardSecondary from "../components/ReportCardSecondary";
import ReportCardPrimary from "../components/ReportCardPrimary";
import logo from "../assets/logo.jpg";

// Draws the watermark straight onto the rendered canvas's pixels (not as a
// separate overlay element) so it can't be removed by hiding/deleting a DOM
// node, and survives a crop since it's tiled across the whole image.
function watermark(canvas, text) {
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.globalAlpha = 0.20;
  ctx.fillStyle = "#0d1b6e";
  ctx.font = `bold ${Math.round(canvas.width / 24)}px Arial, sans-serif`;
  ctx.textAlign = "center";
  const stepX = canvas.width / 1.5;
  const stepY = canvas.height / 6;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-Math.PI / 7);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);
  for (let y = -canvas.height; y < canvas.height * 2; y += stepY) {
    for (let x = -canvas.width; x < canvas.width * 2; x += stepX) {
      ctx.fillText(text, x, y);
    }
  }
  ctx.restore();
}

export default function ParentPortal({ onBack }) {
  const [form, setForm] = useState({ student_code: "", name: "", class_name: "" });
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [hidden, setHidden] = useState(false);
  const offscreenRef = useRef(null);
  const canvasHostRef = useRef(null);

  async function search(e) {
    e.preventDefault();
    setErr(""); setResult(null); setBusy(true);
    try {
      const d = await call("parent_lookup", form);
      setResult(d);
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }

  // Once we have data, render the real report card off-screen, flatten it to
  // a single image and stamp a watermark into the pixels. The parent only
  // ever sees this flattened picture -- never the live, selectable markup.
  useEffect(() => {
    if (!result || !offscreenRef.current) return;
    setRendering(true);
    const node = offscreenRef.current.querySelector(".report-page");
    const t = setTimeout(async () => {
      try {
        const { default: html2canvas } = await import("html2canvas");
        const src = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
        // Draw onto a brand-new canvas rather than reusing html2canvas's own
        // canvas: html2canvas can leave the 2D context in a transformed/clipped
        // state internally, which silently swallowed our watermark drawing.
        const canvas = document.createElement("canvas");
        canvas.width = src.width;
        canvas.height = src.height;
        canvas.getContext("2d").drawImage(src, 0, 0);
        const stamp = `${result.report.student.name} · ${result.report.student.student_code} · viewed ${new Date().toLocaleString()}`;
        watermark(canvas, stamp);
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        canvas.style.display = "block";
        canvas.oncontextmenu = (e) => e.preventDefault();
        canvas.ondragstart = (e) => e.preventDefault();
        if (canvasHostRef.current) {
          canvasHostRef.current.innerHTML = "";
          canvasHostRef.current.appendChild(canvas);
        }
      } finally {
        setRendering(false);
      }
    }, 50);
    return () => clearTimeout(t);
  }, [result]);

  // A soft deterrent: blur the result while the tab is hidden or the window
  // loses focus (e.g. switching to a screenshot/recording tool). This is
  // honest about what it is -- a deterrent, not a technical block, since no
  // website can prevent an OS-level screenshot or a second device's camera.
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    const onBlur = () => setHidden(true);
    const onFocus = () => setHidden(false);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const Template = result?.class?.section === "secondary" ? ReportCardSecondary : ReportCardPrimary;

  return (
    <div className="login-wrap" style={{ alignItems: "flex-start", paddingTop: 40 }}>
      <div style={{ width: "100%", maxWidth: result ? 900 : 420, margin: "0 auto" }}>
        <div className="login-box" style={{ maxWidth: "none", marginBottom: result ? 18 : 0 }}>
          <img src={logo} alt="" />
          <h3>Check your child's result</h3>
          <p className="hint" style={{ marginTop: 0 }}>
            Enter your child's unique Student ID (printed on their report sheet or given by the school),
            their full name (any order is fine) and their class exactly as the school has it (for example
            "Basic 5"). All three must match.
          </p>
          <form onSubmit={search}>
            <label className="lbl">Student ID<input placeholder="e.g. UBK-AB3K7M" value={form.student_code}
              onChange={(e) => setForm({ ...form, student_code: e.target.value })} required autoCapitalize="characters" /></label>
            <label className="lbl">Student's full name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label className="lbl">Class (e.g. Basic 5, JSS 1)<input value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })} required /></label>
            {err && <div className="err" role="alert">{err}</div>}
            <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>{busy ? "Searching…" : "View result"}</button>
          </form>
          <button className="linkbtn" style={{ marginTop: 10 }} onClick={onBack}>← Back to staff sign-in</button>
        </div>

        {result && (
          <div className="card" style={{ padding: 14 }}>
            <p className="hint" style={{ marginTop: 0 }}>
              This is a picture of the result, watermarked with your child's name, ID and the time you
              viewed it, for accountability. Right-click and drag-to-save are disabled here. No website
              can truly block a screenshot or a photo of the screen, so please treat this result as
              private and do not share it.
            </p>
            <div
              className="preview-scroll no-select"
              onContextMenu={(e) => e.preventDefault()}
              style={{ position: "relative", background: "#cfd3e2" }}
            >
              {rendering && <p style={{ textAlign: "center", padding: 40 }}>Preparing result…</p>}
              <div ref={canvasHostRef} style={{ maxWidth: 820, margin: "0 auto" }} />
              {hidden && (
                <div style={{
                  position: "absolute", inset: 0, backdropFilter: "blur(18px)", background: "rgba(20,25,60,0.55)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, textAlign: "center", padding: 20,
                }}>
                  Result hidden while this window isn't in focus
                </div>
              )}
            </div>
          </div>
        )}

        {/* Off-screen: the REAL, live report card, used only as the source for
            the flattened+watermarked picture above. It is never shown itself. */}
        {result && (
          <div ref={offscreenRef} style={{ position: "absolute", left: -99999, top: 0 }}>
            <Template report={result.report} cls={result.class} settings={result.settings} classTeacher={result.classTeacherProfile} />
          </div>
        )}
      </div>
    </div>
  );
}

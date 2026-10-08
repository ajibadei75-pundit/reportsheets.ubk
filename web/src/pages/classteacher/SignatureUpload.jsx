import { useState } from "react";
import { call } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function SignatureUpload() {
  const { profile, refresh } = useAuth();
  const [preview, setPreview] = useState(profile?.signature_url || "");
  const [dataUrl, setDataUrl] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  function pick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) { setMsg("Image too large (max 1.5MB)."); return; }
    const reader = new FileReader();
    reader.onload = () => { setDataUrl(reader.result); setPreview(reader.result); setMsg(""); };
    reader.readAsDataURL(file);
  }

  async function save() {
    setBusy(true);
    try {
      const d = await call("upload_signature", { dataUrl });
      setPreview(d.signature_url + "?t=" + Date.now());
      setDataUrl("");
      await refresh();
      setMsg("Signature saved ✓ — it will appear on your class's report cards.");
    } catch (e) { setMsg("Error: " + e.message); } finally { setBusy(false); }
  }

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h3>My signature</h3>
      <p style={{ fontSize: 13, color: "#666" }}>
        Sign on white paper, take a clear photo or scan, and upload it (PNG/JPG). It is placed on the
        class teacher's signature line of every report card.
      </p>
      <input type="file" accept="image/png,image/jpeg" onChange={pick} />
      {preview && (
        <div style={{ margin: "12px 0", padding: 10, border: "1px dashed #aaa", background: "#fff" }}>
          <img src={preview} alt="signature" style={{ maxHeight: 80, maxWidth: "100%" }} />
        </div>
      )}
      <button className="btn btn-primary" onClick={save} disabled={!dataUrl || busy}>{busy ? "Saving…" : "Save signature"}</button>
      {msg && <div className={msg.startsWith("Error") || msg.startsWith("Image") ? "err" : "msg"}>{msg}</div>}
    </div>
  );
}

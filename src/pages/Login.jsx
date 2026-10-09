import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.jpg";

export default function Login({ onParent }) {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try { await login(username, password); } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }

  return (
    <div className="login-wrap">
      <form className="login-box" onSubmit={submit}>
        <img src={logo} alt="Umar Bn L Khattob Center" />
        <h3>Umar Bn L Khattob Center</h3>
        <p className="hint" style={{ marginTop: 0 }}>Result Portal — sign in with the username and password the admin gave you.</p>
        <label className="lbl">Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" autoFocus required /></label>
        <label className="lbl">Password
          <span className="pwrow">
            <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            <button type="button" className="linkbtn" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button>
          </span></label>
        {import.meta.env.VITE_DEMO === "1" && (
          <div className="banner info" style={{ textAlign: "left", fontSize: 12.5, margin: "0 0 10px" }}>
            <b>Demo logins</b> (any password):<br />
            <code>admin</code> · <code>mrsadeola</code> (Primary 3 class teacher)<br />
            <code>mrbello</code> (JSS 1 class teacher) · <code>mrokafor</code> (subject teacher)<br />
            Parent portal: ID <code>UBK-IY4T8N</code>, name <code>Ibrahim Yusuf</code>, class <code>JSS 1</code>
          </div>
        )}
        {err && <div className="err" role="alert">{err}</div>}
        <button className="btn btn-primary" style={{ width: "100%", marginTop: 6 }} disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        <p className="hint" style={{ marginTop: 12 }}>Forgot your password? Ask the school admin to reset it.</p>
        <button type="button" className="linkbtn" onClick={onParent}>Parent? Check your child's result →</button>
      </form>
    </div>
  );
}

import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";
import Login from "./pages/Login";
import ParentPortal from "./pages/ParentPortal";
import ChangePassword from "./pages/ChangePassword";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ClassTeacherDashboard from "./pages/classteacher/ClassTeacherDashboard";
import SubjectTeacherDashboard from "./pages/subjectteacher/SubjectTeacherDashboard";
import logo from "./assets/logo.jpg";

const ROLE = { admin: "Administrator", class_teacher: "Class teacher", subject_teacher: "Subject teacher" };

function Shell({ children }) {
  const { profile, logout } = useAuth();
  const [pw, setPw] = useState(false);
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src={logo} alt="" />
          <span className="brand-long">Umar Bn L Khattob Center</span>
          <span className="brand-sub">Result Portal</span>
        </div>
        <div className="user">
          <span className="who"><b>{profile?.full_name}</b><small>{ROLE[profile?.role]}</small></span>
          <button onClick={() => setPw(true)}>Password</button>
          <button onClick={logout}>Sign out</button>
        </div>
      </header>
      {children}
      {pw && <ChangePassword onClose={() => setPw(false)} />}
    </div>
  );
}

function Gate() {
  const { profile, loading } = useAuth();
  const [parentMode, setParentMode] = useState(false);
  if (loading) return <div className="splash"><img src={logo} alt="" /><p>Loading…</p></div>;
  if (parentMode) return <ParentPortal onBack={() => setParentMode(false)} />;
  if (!profile) return <Login onParent={() => setParentMode(true)} />;
  if (profile.must_change_password) return <div className="login-wrap"><ChangePassword forced /></div>;
  return (
    <Shell>
      {profile.role === "admin" && <AdminDashboard />}
      {profile.role === "class_teacher" && <ClassTeacherDashboard />}
      {profile.role === "subject_teacher" && <SubjectTeacherDashboard />}
    </Shell>
  );
}

const DEMO = import.meta.env.VITE_DEMO === "1";

export default function App() {
  return (
    <AuthProvider>
      {DEMO && <div className="demo-banner">DEMO MODE — sample data only. Nothing here is saved to your real database.</div>}
      <ToastProvider>
        <BrowserRouter>
          <Routes><Route path="*" element={<Gate />} /></Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

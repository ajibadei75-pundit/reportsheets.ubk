// The school's backend address and its public "anon" key are wired in here as
// DEFAULTS. Both are public by design (they ship in every browser bundle and
// can only call this app's own login-protected API), so having them in the
// code is safe -- and it means a deployment can no longer break just because
// the hosting platform forgot to pass in environment variables. If those
// variables ARE set, they take priority.
const DEFAULT_URL = "https://aufhvlhktvxxchheukly.supabase.co";
const DEFAULT_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1Zmh2bGhrdHZ4eGNoaGV1a2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0ODIyMjcsImV4cCI6MjEwNjA1ODIyN30.uWaIfRMxXCDnZmlFpRf1CV0KU6A7yksltspiKzuKP4M";
const BASE = `${(import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL).replace(/\/+$/, "")}/functions/v1/api`;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON;

export function getToken() {
  return localStorage.getItem("khattob_token") || "";
}
export function setToken(t) {
  if (t) localStorage.setItem("khattob_token", t);
  else localStorage.removeItem("khattob_token");
}

export async function call(action, payload = {}) {
  // Demo build only (VITE_DEMO=1): use the in-memory sample backend instead of
  // the network. In the normal build this branch is removed at compile time.
  if (import.meta.env.VITE_DEMO === "1") {
    const { demoCall } = await import("./demoApi.js");
    return demoCall(action, { token: getToken(), ...payload });
  }
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
    },
    body: JSON.stringify({ action, token: getToken(), ...payload }),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("Couldn't reach the school server (it sent back something unexpected). Please check your internet connection and try again; if it keeps happening, tell the school admin.");
  }
  if (!res.ok) {
    if (res.status === 401) setToken("");
    const err = new Error(data.message || data.error || "Something went wrong.");
    err.status = res.status;
    if (data.conflict) { err.conflict = true; err.current = data.current; }
    throw err;
  }
  return data;
}

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api`;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
    throw new Error("Server did not return a valid response.");
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

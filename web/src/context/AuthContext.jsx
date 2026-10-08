import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { call, getToken, setToken } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [extra, setExtra] = useState({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      const data = await call("me");
      setProfile(data.profile);
      setExtra({ classes: data.classes, assignments: data.assignments });
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function login(username, password) {
    const data = await call("login", { username, password });
    setToken(data.token);
    // Load the profile AND this user's classes/assignments together before
    // showing any dashboard, so a dashboard never mounts with stale data
    // left over from whoever used this browser before.
    const me = await call("me");
    setExtra({ classes: me.classes, assignments: me.assignments });
    setProfile(me.profile);
    return me.profile;
  }

  async function logout() {
    await call("logout").catch(() => {});
    setToken("");
    setExtra({});
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ profile, ...extra, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

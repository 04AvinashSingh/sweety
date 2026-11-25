import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";
const AuthContext = createContext();
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const logout = () => setUser(null);
    window.addEventListener("sweety-signout", logout);
    if (localStorage.getItem("sweety-token"))
      api("/auth/me")
        .then((data) => {
          if (active) setUser(data.user);
        })
        .catch(() => {
          /* The API clears an expired token. Network errors preserve the session. */
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    else setLoading(false);
    return () => {
      active = false;
      window.removeEventListener("sweety-signout", logout);
    };
  }, []);
  async function authenticate(mode, values) {
    const data = await api("/auth/" + mode, {
      method: "POST",
      body: JSON.stringify(values),
    });
    localStorage.setItem("sweety-token", data.token);
    setUser(data.user);
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authenticate,
        logout: () => {
          localStorage.removeItem("sweety-token");
          setUser(null);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);

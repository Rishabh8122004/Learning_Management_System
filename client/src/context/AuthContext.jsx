import { useEffect, useState } from "react";

import { apiRequest } from "../services/apiRequest";
import { AuthContext } from "./authContextValue";


function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    () => localStorage.getItem("trackly-token") || null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // apiRequest announces a rejected login token (expired, or signed out elsewhere). Without this the page would
  // keep showing a signed-in person whose every request fails; now they are sent back to the login page.
  useEffect(() => {
    function handleExpired() {
      setToken(null);
      setUser(null);
      setSessionExpired(true);
    }

    window.addEventListener("trackly-auth-expired", handleExpired);

    return () => window.removeEventListener("trackly-auth-expired", handleExpired);
  }, []);

  useEffect(() => {
    async function restoreSession() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await apiRequest("/auth/me");
        setUser(data.user);
      } catch (error) {
        // Only an explicit 401 means the session is invalid. Network aborts
        // (e.g. refreshing mid-request) and 5xx must not log the user out.
        if (error.status === 401) {
          localStorage.removeItem("trackly-token");
          setToken(null);
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, [token]);

  async function login(email, password) {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
      }),
      skipAuthExpired: true,
    });

    localStorage.setItem("trackly-token", data.token);
    setSessionExpired(false);
    setToken(data.token);
    setUser(data.user);

    return data.user;
  }

  async function register(name, email, password) {
    const data = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name,
        email,
        password,
      }),
      skipAuthExpired: true,
    });

    // No token yet: the server asks the person to confirm their email first.
    return data;
  }

  // Used by the profile page: a new name, or a fresh token after a password change.
  function updateUser(nextUser) {
    setUser(nextUser);
  }

  function replaceToken(nextToken, nextUser) {
    localStorage.setItem("trackly-token", nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }

  function logout() {
    localStorage.removeItem("trackly-token");
    setToken(null);
    setUser(null);
  }

  const value = {
    user,
    token,
    isLoading,
    sessionExpired,
    login,
    register,
    logout,
    updateUser,
    replaceToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
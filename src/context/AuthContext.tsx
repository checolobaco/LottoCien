"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  phone?: string | null;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Inactivity timeout states
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [lastActivity, setLastActivity] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("last_activity_time");
      return stored ? Number(stored) : Date.now();
    }
    return Date.now();
  });

  useEffect(() => {
    // Restore session from localStorage on load
    const storedToken = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("auth_user");

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        
        // Before restoring, check if session is already expired
        const storedLastActivity = localStorage.getItem("last_activity_time");
        if (storedLastActivity) {
          const elapsed = Date.now() - Number(storedLastActivity);
          const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
          const COUNTDOWN_TIMEOUT = 60 * 1000; // 1 minute warning

          if (elapsed >= INACTIVITY_TIMEOUT + COUNTDOWN_TIMEOUT) {
            localStorage.removeItem("auth_token");
            localStorage.removeItem("auth_user");
            localStorage.removeItem("last_activity_time");
            setTimeout(() => {
              setLoading(false);
            }, 0);
            return;
          }
        }

        setTimeout(() => {
          setToken(storedToken);
          setUser(parsedUser);
          setLoading(false);
        }, 0);
        return;
      } catch {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        localStorage.removeItem("last_activity_time");
      }
    }
    setTimeout(() => {
      setLoading(false);
    }, 0);
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("auth_token", newToken);
    localStorage.setItem("auth_user", JSON.stringify(newUser));
    localStorage.setItem("last_activity_time", Date.now().toString());
    setToken(newToken);
    setUser(newUser);
    setLastActivity(Date.now());
  };

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("last_activity_time");
    setToken(null);
    setUser(null);
    router.push("/");
  }, [router]);

  // 1. Persist lastActivity to localStorage so it survives tab freezing/sleep on mobile
  useEffect(() => {
    if (!token) return;
    localStorage.setItem("last_activity_time", lastActivity.toString());
  }, [token, lastActivity]);

  // 2. Helper to check absolute elapsed time since last activity
  const checkAbsoluteInactivity = useCallback(() => {
    if (!token) return;
    const storedLastActivity = localStorage.getItem("last_activity_time");
    if (storedLastActivity) {
      const elapsed = Date.now() - Number(storedLastActivity);
      const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
      const COUNTDOWN_TIMEOUT = 60 * 1000; // 1 minute warning

      if (elapsed >= INACTIVITY_TIMEOUT + COUNTDOWN_TIMEOUT) {
        setShowTimeoutModal(false);
        logout();
        if (typeof window !== "undefined") {
          alert("Tu sesión ha sido cerrada automáticamente debido a inactividad.");
        }
      } else if (elapsed >= INACTIVITY_TIMEOUT) {
        const remainingCountdown = Math.ceil((INACTIVITY_TIMEOUT + COUNTDOWN_TIMEOUT - elapsed) / 1000);
        setCountdown(remainingCountdown > 0 ? remainingCountdown : 1);
        setShowTimeoutModal(true);
      } else {
        setLastActivity(Number(storedLastActivity));
      }
    }
  }, [token, logout]);

  // 3. Check elapsed time immediately on visibility, focus, or pageshow change (wakes up mobile background threads)
  useEffect(() => {
    if (!token) return;

    const timer = setTimeout(() => {
      checkAbsoluteInactivity();
    }, 0);

    const handleWakeUp = () => {
      checkAbsoluteInactivity();
    };

    window.addEventListener("focus", handleWakeUp);
    document.addEventListener("visibilitychange", handleWakeUp);
    window.addEventListener("pageshow", handleWakeUp);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", handleWakeUp);
      document.removeEventListener("visibilitychange", handleWakeUp);
      window.removeEventListener("pageshow", handleWakeUp);
    };
  }, [token, checkAbsoluteInactivity]);

  // 4. Detect user activity to reset the 10-minute inactivity timer
  useEffect(() => {
    if (!token || showTimeoutModal) return;

    const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    
    let lastSaved = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle: only update lastActivity state and localStorage at most once every 10 seconds
      if (now - lastSaved > 10000) {
        lastSaved = now;
        setLastActivity(now);
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity);
    });

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [token, showTimeoutModal]);

  // 5. Schedule the warning modal after 10 minutes of inactivity
  useEffect(() => {
    if (!token) return;

    const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
    const timeSinceLastActivity = Date.now() - lastActivity;
    const remainingTime = Math.max(0, INACTIVITY_TIMEOUT - timeSinceLastActivity);

    const inactivityTimer = setTimeout(() => {
      setShowTimeoutModal(true);
      setCountdown(60);
    }, remainingTime);

    return () => clearTimeout(inactivityTimer);
  }, [token, lastActivity]);

  // 6. Countdown warning modal timer (1 minute / 60 seconds)
  useEffect(() => {
    if (!showTimeoutModal || !token) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowTimeoutModal(false);
          logout();
          if (typeof window !== "undefined") {
            alert("Tu sesión ha sido cerrada automáticamente debido a inactividad.");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showTimeoutModal, token, logout]);

  const handleExtendSession = () => {
    setShowTimeoutModal(false);
    setLastActivity(Date.now());
  };

  const handleLogoutNow = () => {
    setShowTimeoutModal(false);
    logout();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
      {showTimeoutModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center space-y-4 text-slate-100">
            <h3 className="text-slate-100 font-extrabold text-lg">¿Sigues ahí?</h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              Tu sesión está a punto de cerrarse por inactividad. Si no respondes en{" "}
              <span className="font-bold text-indigo-400">{countdown} segundos</span>, se cerrará por completo y deberás volver a iniciar sesión para realizar compras.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={handleExtendSession}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-slate-100 font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer shadow-lg shadow-indigo-500/20"
              >
                Mantener sesión abierta
              </button>
              <button
                onClick={handleLogoutNow}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

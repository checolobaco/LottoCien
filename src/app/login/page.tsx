"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Lock, Mail, ArrowRight, UserPlus, LogIn, AlertCircle, X, Phone } from "lucide-react";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const { user, login } = useAuth();
  const router = useRouter();

  interface ConfigData {
    termsAndConditions: string;
    wompiEnabled: boolean;
    ticketPrice: number;
    prizeMayor: number;
  }

  // Terms Acceptance State
  const [configData, setConfigData] = useState<ConfigData | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch("/api/config");
        if (response.ok) {
          const data = await response.json();
          setConfigData(data);
        }
      } catch (err) {
        console.error("Error al cargar la configuración de términos:", err);
      }
    }
    loadConfig();
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/");
      }
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Registration Terms Acceptance Verification
    if (!isLogin && !acceptedTerms) {
      setError("Debes aceptar los Términos y Condiciones de Uso y Participación para poder registrarte.");
      return;
    }

    setLoading(true);

    if (!email || !password) {
      setError("Todos los campos son obligatorios.");
      setLoading(false);
      return;
    }

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";

    try {
      const payload = isLogin ? { email, password } : { email, password, phone };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Algo salió mal.");
      }

      login(data.token, data.user);
      
      // Redirect based on role
      if (data.user.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Algo salió mal.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8 bg-slate-950 relative overflow-hidden">
      {/* Background glowing decorations */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8 animate-fade-in">
          <img src="https://cdn.lottocien.com/logo%20moderno.png" alt="Lottocien Logo" className="h-24 sm:h-28 w-auto mx-auto object-contain mb-2" />
          <p className="mt-2 text-sm text-slate-400">
            {isLogin
              ? "Ingresa a tu cuenta para comprar y ver tus números"
              : "Regístrate para participar en la rifa semanal"}
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-8 shadow-2xl relative">
          <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-2">
            {isLogin ? (
              <LogIn className="text-emerald-400" key="login-icon" />
            ) : (
              <UserPlus className="text-indigo-400" key="register-icon" />
            )}
            <span>{isLogin ? "Iniciar Sesión" : "Crear Cuenta"}</span>
          </h2>

          {error && (
            <div className="mb-6 bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-start gap-3 text-rose-400 text-sm animate-shake">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="text-slate-500" size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-slate-500" size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Número de Teléfono / WhatsApp
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="text-slate-500" size={18} />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. +573001234567"
                    className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>
            )}

            {!isLogin && (
              <div className="flex items-start gap-2.5 mt-2 bg-slate-900/20 border border-slate-900/60 p-3.5 rounded-xl">
                <input
                  id="accept-terms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-800 bg-slate-950 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0 focus:outline-none"
                  required
                />
                <label htmlFor="accept-terms" className="text-xs text-slate-400 leading-relaxed select-none">
                  Acepto los{" "}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-indigo-400 hover:text-indigo-300 font-bold underline align-baseline"
                  >
                    Términos y Condiciones de Uso y Participación – Lottocien
                  </button>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl text-sm font-bold text-slate-950 transition-all ${
                loading
                  ? "bg-slate-700 cursor-not-allowed text-slate-400"
                  : isLogin
                  ? "bg-emerald-400 hover:bg-emerald-300 shadow-lg shadow-emerald-500/20 active:scale-95"
                  : "bg-indigo-400 hover:bg-indigo-300 shadow-lg shadow-indigo-500/20 active:scale-95"
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? "Entrar" : "Registrarse"}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setPhone("");
              }}
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              {isLogin ? (
                <>
                  ¿No tienes una cuenta? <span className="text-emerald-400 font-semibold">Regístrate aquí</span>
                </>
              ) : (
                <>
                  ¿Ya tienes una cuenta? <span className="text-indigo-400 font-semibold">Inicia sesión</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* TERMS AND CONDITIONS MODAL */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-slate-800 animate-scale-up">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
              <h3 className="font-extrabold text-lg text-slate-100">
                Términos y Condiciones de Uso y Participación
              </h3>
              <button
                onClick={() => setShowTermsModal(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto text-sm text-slate-300 space-y-4 whitespace-pre-wrap leading-relaxed max-h-[60vh] font-sans">
              {configData?.termsAndConditions || "Cargando términos y condiciones..."}
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-900/20">
              <button
                onClick={() => {
                  setAcceptedTerms(true);
                  setShowTermsModal(false);
                }}
                className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition-all active:scale-95"
              >
                Aceptar Términos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, AlertCircle, ArrowLeft, Gamepad2 } from "lucide-react";
import Link from "next/link";

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const transactionId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!transactionId) {
      setTimeout(() => {
        setError("No se recibió ningún identificador de transacción.");
        setLoading(false);
      }, 0);
      return;
    }

    const verifyTransaction = async () => {
      try {
        const res = await fetch("/api/wompi/confirm-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ transactionId }),
        });

        const data = await res.json();
        if (res.ok) {
          setStatus(data.status);
          setReference(data.reference || "");
        } else {
          setError(data.error || "Ocurrió un error al validar la transacción.");
        }
      } catch (err) {
        console.error("Error al validar transacción:", err);
        setError("Error de conexión con el servidor de pagos.");
      } finally {
        setLoading(false);
      }
    };

    verifyTransaction();
  }, [transactionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-indigo-400 border-r-2 border-r-indigo-500/20 animate-spin" />
          <p className="text-slate-400 text-xs tracking-widest uppercase">Verificando tu pago...</p>
        </div>
      </div>
    );
  }

  // --- ERROR STATE ---
  if (error || !status) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl max-w-sm w-full text-center space-y-6 relative overflow-hidden">
          <div className="w-16 h-16 bg-red-950/20 rounded-full flex items-center justify-center border border-red-500/30 mx-auto text-red-400">
            <XCircle size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-slate-100 font-black text-xl tracking-tight">Error de Validación</h2>
            <p className="text-slate-400 text-xs leading-relaxed">{error || "No pudimos confirmar tu transacción."}</p>
          </div>
          <Link
            href="/"
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft size={14} /> Volver a Intentarlo
          </Link>
        </div>
      </div>
    );
  }

  // --- APPROVED STATE ---
  if (status === "APPROVED") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl max-w-md w-full text-center space-y-6 relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-28 h-28 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -right-12 w-28 h-28 bg-indigo-500/10 rounded-full blur-3xl" />

          <div className="w-20 h-20 bg-emerald-950/20 rounded-full flex items-center justify-center border border-emerald-500/30 mx-auto text-emerald-400">
            <CheckCircle2 size={40} className="animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="text-slate-100 font-black text-2xl tracking-tight">¡Pago Aprobado!</h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              Tu transacción ha sido validada y procesada correctamente en la pasarela.
            </p>
          </div>

          {/* Details */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-900 text-left text-xs space-y-2.5">
            <div className="flex justify-between border-b border-slate-900 pb-2">
              <span className="text-slate-500 font-medium">Referencia de Pago:</span>
              <span className="text-slate-200 font-bold">{reference}</span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-2">
              <span className="text-slate-500 font-medium">ID Transacción:</span>
              <span className="text-slate-400 font-mono text-[10px]">{transactionId}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-500 font-medium">Estado:</span>
              <span className="text-emerald-400 font-black tracking-wide uppercase text-[10px] bg-emerald-950/30 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                Aprobado
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3 pt-2">
            <Link
              href="/#mis-tickets-section"
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-black rounded-xl text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <Gamepad2 size={16} /> Jugar Pasatiempo
            </Link>
            <Link
              href="/#mis-tickets-section"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Ir a Mis Tickets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- PENDING STATE ---
  if (status === "PENDING") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl max-w-sm w-full text-center space-y-6 relative overflow-hidden">
          <div className="w-16 h-16 bg-amber-950/20 rounded-full flex items-center justify-center border border-amber-500/30 mx-auto text-amber-400">
            <AlertCircle size={32} className="animate-bounce" />
          </div>
          <div className="space-y-2">
            <h2 className="text-slate-100 font-black text-xl tracking-tight">Pago en Proceso</h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              La pasarela está verificando tu pago. Esto puede tomar unos minutos en procesarse por completo.
            </p>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">ID Transacción:</span>
              <span className="text-slate-400 font-mono text-[10px]">{transactionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Estado:</span>
              <span className="text-amber-400 font-bold uppercase text-[10px]">{status}</span>
            </div>
          </div>
          <Link
            href="/"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/10"
          >
            Volver a la Página Principal
          </Link>
        </div>
      </div>
    );
  }

  // --- DECLINED / VOIDED / ERROR STATE ---
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl max-w-sm w-full text-center space-y-6 relative overflow-hidden">
        <div className="w-16 h-16 bg-red-950/20 rounded-full flex items-center justify-center border border-red-500/30 mx-auto text-red-400">
          <XCircle size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-slate-100 font-black text-xl tracking-tight">Transacción Rechazada</h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            El pago fue rechazado por la entidad financiera o cancelado. Por favor, intenta de nuevo.
          </p>
        </div>
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 text-left text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Estado Wompi:</span>
            <span className="text-red-400 font-bold uppercase text-[10px]">{status}</span>
          </div>
        </div>
        <Link
          href="/"
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft size={14} /> Volver a Intentarlo
        </Link>
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 rounded-full border-t-2 border-indigo-400 border-r-2 border-r-indigo-500/20 animate-spin" />
            <p className="text-slate-400 text-xs tracking-widest uppercase">Cargando...</p>
          </div>
        </div>
      }
    >
      <PaymentResultContent />
    </Suspense>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { 
  Trophy, 
  RefreshCw, 
  Users, 
  DollarSign, 
  Ticket as TicketIcon, 
  Terminal, 
  Award, 
  ArrowLeft, 
  Play, 
  CheckCircle, 
  XCircle,
  FileText,
  Check,
  X,
  Clock,
  Settings
} from "lucide-react";

interface Ticket {
  number: string;
  status: "AVAILABLE" | "PENDING" | "PENDING_APPROVAL" | "SOLD";
  userId: string | null;
  reservedAt: string | null;
  transactionRef: string | null;
  paymentMethod: string | null;
  receiptUrl: string | null;
  user?: {
    email: string;
  };
}

interface Winner {
  number: string;
  email: string;
  prizes: string[];
}

interface GroupedApproval {
  transactionRef: string;
  email: string;
  numbers: string[];
  receiptUrl: string;
  reservedAt: string;
}

interface DrawHistoryEntry {
  id: string;
  winningNumber: string;
  drawnAt: string;
  lotteryName: string;
  ticketPrice: number;
  prizeMayor: number;
  prizeSecundario: number;
  prizeConsolacion: number;
  winners: string; // JSON string representing winners array
  createdAt: string;
}

const formatCOP = (val: number): string => {
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseWinners = (winnersStr: string): Winner[] => {
  try {
    return JSON.parse(winnersStr) || [];
  } catch (e) {
    return [];
  }
};

const formatForDateTimeLocal = (dateString: string | null) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function AdminDashboard() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  // State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [raffleState, setRaffleState] = useState<{
    winningNumber: string | null;
    drawnAt: string | null;
    ticketPrice: number;
    prizeMayor: number;
    prizeSecundario: number;
    prizeConsolacion: number;
    lotteryName: string;
    termsAndConditions: string;
    wompiEnabled: boolean;
    drawDate: string | null;
    drawWarningMessage: string;
    drawWarningSent: boolean;
    showDrawWarning: boolean;
    showDrawHistory: boolean;
  } | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [groupedApprovals, setGroupedApprovals] = useState<GroupedApproval[]>([]);
  
  // Prize Claims States
  interface PrizeClaim {
    id: string;
    raffleId: string;
    winningNumber: string;
    tickets: string;
    prizes: string;
    totalAmount: number;
    bankName: string;
    accountNumber: string;
    accountType: string;
    accountHolder: string;
    documentNumber: string;
    status: "PENDING" | "PAID" | "REJECTED";
    rejectionReason: string | null;
    clientNote: string | null;
    createdAt: string;
    user: {
      email: string;
    };
  }
  const [claims, setClaims] = useState<PrizeClaim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);

  // Form States
  const [winningInput, setWinningInput] = useState("");
  const [simStatus, setSimStatus] = useState<"APPROVED" | "DECLINED">("APPROVED");
  const [simSelectedRef, setSimSelectedRef] = useState("");
  
  // Config Form States
  const [ticketPriceInput, setTicketPriceInput] = useState(15000);
  const [prizeMayorInput, setPrizeMayorInput] = useState(700000);
  const [prizeSecundarioInput, setPrizeSecundarioInput] = useState(200000);
  const [prizeConsolacionInput, setPrizeConsolacionInput] = useState(100000);
  const [lotteryNameInput, setLotteryNameInput] = useState("Lotería de Medellín");
  const [termsInput, setTermsInput] = useState("");
  const [wompiEnabledInput, setWompiEnabledInput] = useState(true);
  const [drawDateInput, setDrawDateInput] = useState("");
  const [drawWarningMessageInput, setDrawWarningMessageInput] = useState("");
  const [showDrawWarningInput, setShowDrawWarningInput] = useState(true);
  const [showDrawHistoryInput, setShowDrawHistoryInput] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);

  // UI states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [simResult, setSimResult] = useState("");

  // Draw History States
  const [drawHistory, setDrawHistory] = useState<DrawHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedDrawClaims, setExpandedDrawClaims] = useState<{ [drawId: string]: boolean }>({});
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const fetchClaims = useCallback(async () => {
    if (!token) return;
    try {
      setClaimsLoading(true);
      const response = await fetch("/api/admin/claims", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setClaims(data.claims);
      }
    } catch (err) {
      console.error("Error al obtener reclamaciones:", err);
    } finally {
      setClaimsLoading(false);
    }
  }, [token]);

  const fetchDrawHistory = useCallback(async () => {
    if (!token) return;
    try {
      setHistoryLoading(true);
      const response = await fetch("/api/admin/draw-history", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setDrawHistory(data.history);
      }
    } catch (err) {
      console.error("Error al obtener historial de sorteos:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [token]);

  const handleClaimAction = async (claimId: string, status: "PAID" | "REJECTED") => {
    let rejectionReason = "";
    if (status === "REJECTED") {
      const promptReason = prompt("Por favor, introduce la nota explicativa del por qué rechazas esta reclamación:");
      if (promptReason === null) return; // User cancelled
      if (promptReason.trim() === "") {
        alert("Debes proporcionar un motivo de rechazo.");
        return;
      }
      rejectionReason = promptReason;
    } else {
      if (!confirm("¿Estás seguro de marcar esta reclamación como PAGADA?")) {
        return;
      }
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ claimId, status, rejectionReason }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar la reclamación.");
      }

      setSuccess(data.message || "Reclamación actualizada con éxito.");
      fetchClaims();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const TICKET_PRICE = raffleState?.ticketPrice || 15000;

  // Process and group tickets waiting for manual transfer validation
  const processGroupedApprovals = (ticketsList: Ticket[]) => {
    const approvalsMap: { [ref: string]: GroupedApproval } = {};
    
    ticketsList.forEach((t) => {
      if (t.status === "PENDING_APPROVAL" && t.transactionRef) {
        if (!approvalsMap[t.transactionRef]) {
          approvalsMap[t.transactionRef] = {
            transactionRef: t.transactionRef,
            email: t.user?.email || "Sin email",
            numbers: [],
            receiptUrl: t.receiptUrl || "",
            reservedAt: t.reservedAt || "",
          };
        }
        approvalsMap[t.transactionRef].numbers.push(t.number);
      }
    });

    setGroupedApprovals(Object.values(approvalsMap));
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("/api/tickets", { cache: "no-store" });
      if (!response.ok) throw new Error("Error al obtener tickets");
      const data = await response.json();
      setTickets(data.tickets);
      setRaffleState(data.raffleState);
      
      if (data.raffleState) {
        setTicketPriceInput(data.raffleState.ticketPrice ?? 15000);
        setPrizeMayorInput(data.raffleState.prizeMayor ?? 700000);
        setPrizeSecundarioInput(data.raffleState.prizeSecundario ?? 200000);
        setPrizeConsolacionInput(data.raffleState.prizeConsolacion ?? 100000);
        setLotteryNameInput(data.raffleState.lotteryName ?? "Lotería de Medellín");
        setTermsInput(data.raffleState.termsAndConditions ?? "");
        setWompiEnabledInput(data.raffleState.wompiEnabled ?? true);
        setDrawDateInput(formatForDateTimeLocal(data.raffleState.drawDate));
        setDrawWarningMessageInput(data.raffleState.drawWarningMessage ?? "");
        setShowDrawWarningInput(data.raffleState.showDrawWarning ?? true);
        setShowDrawHistoryInput(data.raffleState.showDrawHistory ?? true);
      }
      
      processGroupedApprovals(data.tickets);
    } catch (err) {
      setError("Error al cargar la información del panel.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
      // Handled below in render guard
    } else {
      fetchData();
      fetchClaims();
      fetchDrawHistory();
    }
  }, [user, authLoading, fetchData, fetchClaims, fetchDrawHistory]);

  // Auth Protection guard
  if (authLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 min-h-screen">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 mt-4 text-sm">Cargando perfil...</p>
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 min-h-screen text-center px-4">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-6">
          <XCircle size={32} />
        </div>
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Acceso No Autorizado</h1>
        <p className="text-slate-400 max-w-md mb-6">
          Este panel es exclusivo para el usuario administrador del sorteo.
        </p>
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-bold hover:bg-slate-800 transition-all text-sm"
        >
          <ArrowLeft size={16} />
          Volver a la Grilla
        </Link>
      </div>
    );
  }

  // Calculate statistics
  const totalSold = tickets.filter(t => t.status === "SOLD").length;
  const totalPending = tickets.filter(t => t.status === "PENDING").length;
  const totalPendingApproval = tickets.filter(t => t.status === "PENDING_APPROVAL").length;
  const totalAvailable = tickets.filter(t => t.status === "AVAILABLE").length;
  const estimatedRevenue = totalSold * TICKET_PRICE;

  // Save lottery config changes
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setConfigSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticketPrice: Number(ticketPriceInput),
          prizeMayor: Number(prizeMayorInput),
          prizeSecundario: Number(prizeSecundarioInput),
          prizeConsolacion: Number(prizeConsolacionInput),
          lotteryName: lotteryNameInput,
          termsAndConditions: termsInput,
          wompiEnabled: wompiEnabledInput,
          drawDate: drawDateInput ? new Date(drawDateInput).toISOString() : null,
          drawWarningMessage: drawWarningMessageInput,
          showDrawWarning: showDrawWarningInput,
          showDrawHistory: showDrawHistoryInput,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Fallo al guardar la configuración");

      setSuccess("Configuración del sorteo actualizada exitosamente.");
      setRaffleState(data.raffleState);
      if (data.raffleState) {
        setDrawDateInput(formatForDateTimeLocal(data.raffleState.drawDate));
        setDrawWarningMessageInput(data.raffleState.drawWarningMessage ?? "");
        setShowDrawWarningInput(data.raffleState.showDrawWarning ?? true);
        setShowDrawHistoryInput(data.raffleState.showDrawHistory ?? true);
      }
    } catch (err: any) {
      setError(err.message || "Error al conectar con el servidor.");
    } finally {
      setActionLoading(false);
      setConfigSaving(false);
    }
  };

  // Submit winning lottery number
  const handleDraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setWinners([]);

    if (winningInput.length !== 4 || isNaN(Number(winningInput))) {
      setError("El número ganador debe ser exactamente de 4 cifras (ej: 0954).");
      return;
    }

    setActionLoading(true);

    try {
      const response = await fetch("/api/admin/draw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ winningNumber: winningInput }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al calcular ganadores");
      }

      setSuccess(`¡Sorteo guardado correctamente con el número ${winningInput}!`);
      setWinners(data.winners);
      setRaffleState(data.raffleState);
      fetchData(); // Refresh tickets data
      fetchDrawHistory(); // Refresh history
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Reset weekly raffle
  const handleReset = async () => {
    if (!confirm("¿Estás seguro de que quieres reiniciar el sorteo? Esto liberará todos los números vendidos y pendientes, y borrará el número ganador actual.")) {
      return;
    }

    setError("");
    setSuccess("");
    setWinners([]);
    setWinningInput("");
    setActionLoading(true);

    try {
      const response = await fetch("/api/admin/reset", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al reiniciar el sorteo");
      }

      setSuccess("¡Sorteo reiniciado con éxito para la nueva semana!");
      setRaffleState(data.raffleState);
      fetchData();
      fetchDrawHistory(); // Refresh history
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Approve or Reject Bank Transfer
  const handleReceiptAction = async (transactionRef: string, action: "APPROVE" | "REJECT") => {
    let reason = "";
    if (action === "REJECT") {
      const promptReason = prompt("Por favor, introduce el motivo del rechazo del comprobante:");
      if (promptReason === null) return; // User cancelled
      if (promptReason.trim() === "") {
        alert("Debes proporcionar un motivo de rechazo.");
        return;
      }
      reason = promptReason;
    } else {
      if (!confirm("¿Confirmas que el dinero de esta transferencia ha ingresado a la cuenta y deseas validar los tickets?")) {
        return;
      }
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/receipts/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ transactionRef, action, reason }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fallo al procesar la acción del recibo.");
      }

      setSuccess(
        action === "APPROVE"
          ? "Compra aprobada con éxito. Se ha enviado correo de confirmación al cliente."
          : "Reserva rechazada. Se han liberado los números y enviado correo explicativo al cliente."
      );
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Simulate Wompi webhook (APPROVED or DECLINED)
  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimResult("");

    if (!simSelectedRef) {
      alert("Selecciona un ticket pendiente de la lista para simular.");
      return;
    }

    try {
      const response = await fetch("/api/admin/simulate-wompi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reference: simSelectedRef,
          status: simStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "La llamada al webhook falló.");
      }

      setSimResult(`Simulación enviada. ${data.message}`);
      setSimSelectedRef("");
      fetchData();
    } catch (err: any) {
      setSimResult(`Error: ${err.message}`);
    }
  };

  const pendingTickets = tickets.filter(t => t.status === "PENDING");

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Decorative neon lights */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl -z-10" />

      {/* HEADER NAVBAR */}
      <header className="glass-panel border-b border-slate-900 sticky top-0 z-50 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <span className="font-extrabold text-xl tracking-wider text-indigo-400">
              PANEL ADMINISTRATIVO
            </span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-950/20 border border-indigo-500/20">
            <Users size={12} className="text-indigo-400" />
            Sesión: {user.email}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 flex-1 w-full space-y-8">
        
        {/* MESSAGES */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-400 text-sm flex items-center gap-3 animate-fade-in">
            <XCircle className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-emerald-400 text-sm flex items-center gap-3 animate-fade-in">
            <CheckCircle className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* METRICS GRID */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-panel h-28 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Recaudado (Aprobados)</p>
                <p className="text-xl sm:text-2xl font-extrabold text-slate-100">
                  ${formatCOP(estimatedRevenue)} COP
                </p>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400">
                <TicketIcon size={24} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Vendidos</p>
                <p className="text-2xl font-extrabold text-slate-100">{totalSold} / 100</p>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-xl text-orange-400">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Por Validar (R2)</p>
                <p className="text-2xl font-extrabold text-slate-100">{totalPendingApproval}</p>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-slate-800 rounded-xl text-slate-400">
                <TicketIcon size={24} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Disponibles</p>
                <p className="text-2xl font-extrabold text-slate-100">{totalAvailable}</p>
              </div>
            </div>
          </div>
        )}

        {/* OPERATIONS SECTION */}
        <div className="grid grid-cols-1 grid-flow-row-dense lg:grid-cols-12 gap-8">
          
          {/* DRAW CONTROL & VALIDATION PANELS (7 COLS) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* 1. BANK TRANSFER MANUAL VERIFICATION WORKLIST */}
            <div className="glass-panel rounded-2xl p-6 shadow-2xl space-y-6">
              <h3 className="font-extrabold text-lg flex items-center gap-2 border-b border-slate-900 pb-4">
                <FileText className="text-orange-400" size={20} />
                Validación de Transferencias Bancarias
              </h3>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-400">Cargando comprobantes...</p>
                </div>
              ) : groupedApprovals.length === 0 ? (
                <p className="text-slate-500 text-sm py-4 text-center">No hay transferencias bancarias pendientes de validación en este momento.</p>
              ) : (
                <div className="space-y-4">
                  {groupedApprovals.map((approval) => (
                    <div 
                      key={approval.transactionRef}
                      className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-2">
                        <div>
                          <span className="text-slate-500 block mb-0.5">Usuario Cliente:</span>
                          <span className="font-bold text-slate-200 text-sm">{approval.email}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-slate-500">Tickets:</span>
                          {approval.numbers.map(num => (
                            <span key={num} className="px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold">
                              {num}
                            </span>
                          ))}
                        </div>
                        <div className="text-[10px] text-slate-600">
                          Ref: <span className="font-mono">{approval.transactionRef}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 self-end md:self-center">
                        <a 
                          href={approval.receiptUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all border border-slate-700"
                        >
                          Ver Recibo
                        </a>
                        <button
                          onClick={() => handleReceiptAction(approval.transactionRef, "APPROVE")}
                          disabled={actionLoading}
                          className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold transition-all flex items-center gap-1 disabled:opacity-40"
                          title="Aprobar Pago"
                        >
                          <Check size={16} />
                          <span className="hidden sm:inline">Aprobar</span>
                        </button>
                        <button
                          onClick={() => handleReceiptAction(approval.transactionRef, "REJECT")}
                          disabled={actionLoading}
                          className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 font-bold transition-all flex items-center gap-1 disabled:opacity-40"
                          title="Rechazar Pago"
                        >
                          <X size={16} />
                          <span className="hidden sm:inline">Rechazar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. WEEKLY DRAW & WINNERS CALCULATOR */}
            <div className="glass-panel rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="flex justify-between items-center border-b border-slate-900 pb-4">
                <h3 className="font-extrabold text-lg flex items-center gap-2">
                  <Trophy className="text-yellow-400" size={20} />
                  Resultados del Sorteo
                </h3>
                {raffleState?.winningNumber && (
                  <button
                    onClick={handleReset}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-all disabled:opacity-50"
                  >
                    <RefreshCw size={12} />
                    Reiniciar Sorteo
                  </button>
                )}
              </div>

              <form onSubmit={handleDraw} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Ingresar Número de Lotería (4 Cifras)
                  </label>
                  <input
                    type="text"
                    value={winningInput}
                    onChange={(e) => setWinningInput(e.target.value.slice(0, 4))}
                    placeholder="Ej: 5493"
                    className="block w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-center tracking-widest text-lg font-bold"
                    maxLength={4}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="py-3 px-4 bg-indigo-500 hover:bg-indigo-400 text-slate-100 font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <Award size={18} />
                  {actionLoading ? "Calculando..." : "Calcular Ganadores"}
                </button>
              </form>

              {/* WINNERS LOGS */}
              {raffleState?.winningNumber && (
                <div className="bg-slate-900/40 rounded-xl border border-slate-900 p-5 space-y-4">
                  <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider">
                    Ganadores del Sorteo (Lotería: {raffleState.winningNumber})
                  </h4>

                  {winners.length === 0 ? (
                    <p className="text-slate-500 text-sm py-2">Ninguno de los tickets vendidos acertó los premios del sorteo de esta semana.</p>
                  ) : (
                    <div className="divide-y divide-slate-900">
                      {winners.map((winner, idx) => (
                        <div key={idx} className="py-3 flex justify-between items-center text-sm">
                          <div>
                            <span className="font-bold text-slate-200 block">{winner.email}</span>
                            <span className="text-xs text-slate-500">Ticket comprado: #{winner.number}</span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {winner.prizes.map((p, pIdx) => (
                              <span 
                                key={pIdx} 
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  p === "Premio Mayor" 
                                    ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" 
                                    : p === "Premio Secundario" 
                                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                                    : "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                                }`}
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2.4 PRIZE CLAIMS PANEL */}
            <div className="glass-panel rounded-2xl p-6 shadow-2xl space-y-6">
              <h3 className="font-extrabold text-lg flex items-center gap-2 border-b border-slate-900 pb-4">
                <Trophy className="text-emerald-400" size={20} />
                Reclamaciones de Premios por Transferencia
              </h3>

              {claimsLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-400">Cargando reclamaciones...</p>
                </div>
              ) : claims.filter(claim => claim.raffleId === raffleState?.drawnAt).length === 0 ? (
                <p className="text-slate-500 text-sm py-4 text-center">No hay reclamaciones de premios registradas para el sorteo en curso.</p>
              ) : (
                <div className="space-y-4">
                  {claims.filter(claim => claim.raffleId === raffleState?.drawnAt).map((claim) => (
                    <div 
                      key={claim.id}
                      className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl flex flex-col gap-4 text-xs"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-950 pb-2.5">
                        <div>
                          <span className="text-slate-500 block mb-0.5 font-semibold">Ganador:</span>
                          <span className="font-bold text-slate-200 text-sm">{claim.user?.email}</span>
                        </div>
                        <div>
                          {claim.status === "PENDING" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                              <Clock size={11} className="animate-pulse" /> Pendiente
                            </span>
                          )}
                          {claim.status === "PAID" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                              <Check size={11} /> Pagado
                            </span>
                          )}
                          {claim.status === "REJECTED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                              <X size={11} /> Rechazado
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Winnings summary */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detalles de Premios:</p>
                          <table className="w-full text-slate-300">
                            <tbody>
                              <tr>
                                <td className="text-slate-500 py-0.5">Tickets Ganadores:</td>
                                <td className="font-bold text-slate-200 text-right">{claim.tickets}</td>
                              </tr>
                              <tr>
                                <td className="text-slate-500 py-0.5">Categorías:</td>
                                <td className="font-semibold text-slate-200 text-right truncate max-w-[150px]" title={claim.prizes}>{claim.prizes}</td>
                              </tr>
                              <tr>
                                <td className="text-slate-500 py-0.5">Total a Transferir:</td>
                                <td className="font-black text-emerald-400 text-right">${formatCOP(claim.totalAmount)} COP</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Bank Details */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Datos de Destino:</p>
                          <table className="w-full text-slate-300">
                            <tbody>
                              <tr>
                                <td className="text-slate-500 py-0.5">Banco:</td>
                                <td className="font-semibold text-slate-200 text-right">{claim.bankName}</td>
                              </tr>
                              <tr>
                                <td className="text-slate-500 py-0.5">N° Cuenta / Tipo:</td>
                                <td className="font-mono font-semibold text-slate-200 text-right">{claim.accountNumber} ({claim.accountType})</td>
                              </tr>
                              <tr>
                                <td className="text-slate-500 py-0.5">Titular / Doc:</td>
                                <td className="font-semibold text-slate-200 text-right">{claim.accountHolder} - {claim.documentNumber}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Administrative and Client notes */}
                      {(claim.rejectionReason || claim.clientNote) && (
                        <div className="space-y-2 pt-2 border-t border-slate-900/50">
                          {claim.rejectionReason && (
                            <div className="bg-rose-950/20 border border-rose-500/10 rounded-xl p-3 text-[11px] text-rose-400">
                              <span className="font-bold block mb-0.5">Nota de Rechazo Admin:</span>
                              &quot;{claim.rejectionReason}&quot;
                            </div>
                          )}
                          {claim.clientNote && (
                            <div className="bg-indigo-950/20 border border-indigo-500/25 rounded-xl p-3 text-[11px] text-indigo-300">
                              <span className="font-bold block mb-0.5 flex items-center gap-1">
                                <FileText size={11} />
                                Nota Aclaratoria del Cliente:
                              </span>
                              <span className="italic block bg-slate-900/50 p-2 rounded border border-slate-800/80 mt-1 whitespace-pre-wrap">
                                &quot;{claim.clientNote}&quot;
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {(claim.status === "PENDING" || (claim.status === "REJECTED" && claim.clientNote)) && (
                        <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-950/60">
                          <button
                            onClick={() => handleClaimAction(claim.id, "PAID")}
                            disabled={actionLoading}
                            className="px-3.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold transition-all flex items-center gap-1 disabled:opacity-40"
                          >
                            <Check size={14} />
                            Marcar como Pagado
                          </button>
                          <button
                            onClick={() => handleClaimAction(claim.id, "REJECTED")}
                            disabled={actionLoading}
                            className="px-3.5 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 font-bold transition-all flex items-center gap-1 disabled:opacity-40"
                          >
                            <X size={14} />
                            Rechazar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2.5 RAFFLE CONFIGURATION PANEL */}
            <div className="glass-panel rounded-2xl p-6 shadow-2xl space-y-6">
              <h3 className="font-extrabold text-lg flex items-center gap-2 border-b border-slate-900 pb-4">
                <Settings className="text-emerald-400" size={20} />
                Configuración del Sorteo y Premios
              </h3>

              <form onSubmit={handleSaveConfig} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Nombre de Lotería de Referencia
                    </label>
                    <input
                      type="text"
                      value={lotteryNameInput}
                      onChange={(e) => setLotteryNameInput(e.target.value)}
                      placeholder="Ej: Lotería de Medellín"
                      className="block w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Valor del Ticket (COP)
                    </label>
                    <input
                      type="number"
                      value={ticketPriceInput}
                      onChange={(e) => setTicketPriceInput(Math.max(1, parseInt(e.target.value) || 0))}
                      placeholder="Ej: 15000"
                      className="block w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono"
                      required
                      min={1}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Premio Mayor (2 Últimas Cifras)
                    </label>
                    <input
                      type="number"
                      value={prizeMayorInput}
                      onChange={(e) => setPrizeMayorInput(Math.max(1, parseInt(e.target.value) || 0))}
                      placeholder="Ej: 700000"
                      className="block w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono"
                      required
                      min={1}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Premio Secundario (2 Primeras)
                    </label>
                    <input
                      type="number"
                      value={prizeSecundarioInput}
                      onChange={(e) => setPrizeSecundarioInput(Math.max(1, parseInt(e.target.value) || 0))}
                      placeholder="Ej: 200000"
                      className="block w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono"
                      required
                      min={1}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Consolación (2 Cifras Medio)
                    </label>
                    <input
                      type="number"
                      value={prizeConsolacionInput}
                      onChange={(e) => setPrizeConsolacionInput(Math.max(1, parseInt(e.target.value) || 0))}
                      placeholder="Ej: 100000"
                      className="block w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono"
                      required
                      min={1}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Fecha y Hora del Sorteo (Programación)
                    </label>
                    <input
                      type="datetime-local"
                      value={drawDateInput}
                      onChange={(e) => setDrawDateInput(e.target.value)}
                      className="block w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      El sistema enviará el aviso a los clientes 2 horas antes de esta hora si las ventas están por debajo del 80%. Deja vacío para desactivar.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Mensaje de Advertencia (Ventas &lt; 80%)
                    </label>
                    <textarea
                      value={drawWarningMessageInput}
                      onChange={(e) => setDrawWarningMessageInput(e.target.value)}
                      placeholder="Ej: El sorteo no ha alcanzado el 80% mínimo de ventas..."
                      className="block w-full h-[88px] px-4 py-2.5 border border-slate-800 rounded-xl bg-slate-900/50 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-xs leading-normal font-sans"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-900/30 border border-slate-900 p-4 rounded-xl">
                  <input
                    type="checkbox"
                    id="wompiEnabledToggle"
                    checked={wompiEnabledInput}
                    onChange={(e) => setWompiEnabledInput(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-500 focus:ring-indigo-500 bg-slate-950 border-slate-800 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="wompiEnabledToggle" className="block text-sm font-bold text-slate-200 cursor-pointer">
                      Habilitar Pasarela de Pagos Wompi
                    </label>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      Si se desactiva, los clientes únicamente podrán comprar tickets adjuntando comprobante de transferencia bancaria manual.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-900/30 border border-slate-900 p-4 rounded-xl">
                  <input
                    type="checkbox"
                    id="showDrawWarningToggle"
                    checked={showDrawWarningInput}
                    onChange={(e) => setShowDrawWarningInput(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-500 focus:ring-indigo-500 bg-slate-950 border-slate-800 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="showDrawWarningToggle" className="block text-sm font-bold text-slate-200 cursor-pointer">
                      Mostrar Mensaje de Advertencia (Ventas &lt; 80%)
                    </label>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      Si está marcado, los clientes verán el cuadro de advertencia en la página principal cuando las ventas estén por debajo del 80%.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Términos y Condiciones de Uso y Participación
                  </label>
                  <textarea
                    value={termsInput}
                    onChange={(e) => setTermsInput(e.target.value)}
                    placeholder="Escribe aquí los términos de uso y participación del sorteo..."
                    className="block w-full h-40 px-4 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm leading-relaxed font-sans"
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={actionLoading || configSaving}
                    className="py-3 px-5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle size={18} />
                    {configSaving ? "Guardando..." : "Guardar Configuración"}
                  </button>
                </div>
              </form>
            </div>

            {/* 3. WEBHOOK SIMULATOR (SANDBOX DEV PANEL) */}
            <div className="glass-panel rounded-2xl p-6 shadow-2xl space-y-5 border border-indigo-500/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 text-[10px] font-bold text-indigo-400 tracking-wider bg-indigo-500/5 rounded-bl-xl border-l border-b border-indigo-500/10 uppercase">
                Sandbox Tool
              </div>

              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <Terminal className="text-indigo-400" size={20} />
                Simulador de Webhook de Wompi (Local)
              </h3>
              
              <p className="text-xs text-slate-400 leading-relaxed">
                Este panel simula la llamada HTTP POST del Webhook de Wompi cuando una transacción cambia de estado. Se calcula la firma de forma automática con la llave de eventos de prueba para validar el comportamiento del backend de manera 100% real.
              </p>

              <form onSubmit={handleSimulateWebhook} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Seleccionar Ticket Pendiente
                    </label>
                    <select
                      value={simSelectedRef}
                      onChange={(e) => setSimSelectedRef(e.target.value)}
                      className="block w-full px-3 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">-- Elige un ticket en pago --</option>
                      {pendingTickets.map((t) => (
                        <option key={t.number} value={t.transactionRef || ""}>
                          Ticket #{t.number} ({t.user?.email || "Sin email"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Simular Estado Transacción
                    </label>
                    <select
                      value={simStatus}
                      onChange={(e) => setSimStatus(e.target.value as "APPROVED" | "DECLINED")}
                      className="block w-full px-3 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="APPROVED">APPROVED (Aprobado)</option>
                      <option value="DECLINED">DECLINED (Rechazado)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={pendingTickets.length === 0}
                  className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                    pendingTickets.length === 0
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800"
                      : "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 active:scale-98"
                  }`}
                >
                  <Play size={14} />
                  Simular Transacción Wompi
                </button>
              </form>

              {simResult && (
                <div className="mt-3 bg-slate-900 rounded-xl p-3 border border-slate-800 text-xs font-mono text-indigo-400">
                  {simResult}
                </div>
              )}
            </div>
          </div>

          {/* SALES TABLE (5 COLS) */}
          <div className="lg:col-span-5">
            <div className="glass-panel rounded-2xl p-6 shadow-2xl space-y-6 h-full flex flex-col">
              <h3 className="font-extrabold text-lg flex items-center gap-2 border-b border-slate-900 pb-4">
                <Users className="text-indigo-400" size={20} />
                Lista de Ventas Activas
              </h3>

              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3">
                  <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-500">Cargando ventas...</p>
                </div>
              ) : tickets.filter(t => t.status !== "AVAILABLE").length === 0 ? (
                <div className="flex-1 flex flex-col justify-center items-center py-24 text-slate-500 text-center space-y-3">
                  <TicketIcon size={32} className="text-slate-700" />
                  <p className="text-sm">Aún no hay compras o reservas activas para el sorteo de esta semana.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-4 max-h-[500px] pr-1">
                  {tickets
                    .filter(t => t.status !== "AVAILABLE")
                    .map((t) => {
                      let statusBadge = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
                      let statusText = "Vendido";

                      if (t.status === "PENDING_APPROVAL") {
                        statusBadge = "bg-orange-500/10 text-orange-400 border border-orange-500/20";
                        statusText = "En Validación";
                      } else if (t.status === "PENDING") {
                        statusBadge = "bg-violet-500/10 text-violet-400 border border-violet-500/20";
                        statusText = "Reservado (Wompi)";
                      }

                      return (
                        <div 
                          key={t.number} 
                          className="p-3 bg-slate-900/30 border border-slate-900 rounded-xl flex items-center justify-between gap-3 text-xs animate-fade-in"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-200">Ticket #{t.number}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge}`}>
                                {statusText}
                              </span>
                            </div>
                            <p className="text-slate-500 font-mono text-[10px] truncate max-w-[200px]" title={t.user?.email}>
                              Usuario: {t.user?.email || "Sin asignar"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-slate-300">
                              ${formatCOP(TICKET_PRICE)} COP
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {t.reservedAt ? new Date(t.reservedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* 4. PAST DRAWS HISTORY PANEL */}
        <div className="glass-panel rounded-2xl p-6 shadow-2xl space-y-6 mt-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-900 pb-4">
            <h3 className="font-extrabold text-lg flex items-center gap-2">
              <Clock className="text-indigo-400" size={20} />
              Historial de Sorteos Pasados
            </h3>
            <button
              type="button"
              onClick={() => setHistoryExpanded(!historyExpanded)}
              className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 font-bold rounded-lg text-xs transition-all flex items-center gap-1"
            >
              {historyExpanded ? "Ocultar Historial" : `Ver Historial (${drawHistory.length})`}
            </button>
          </div>

          {historyExpanded && (
            <>
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-500">Cargando historial de sorteos...</p>
                </div>
              ) : drawHistory.length === 0 ? (
                <p className="text-slate-500 text-sm py-8 text-center">No hay sorteos anteriores registrados en el historial.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {drawHistory.map((draw) => {
                    const parsedWinners = parseWinners(draw.winners);
                    const drawDate = new Date(draw.drawnAt);

                    return (
                      <div 
                        key={draw.id} 
                        className="p-5 bg-slate-900/40 border border-slate-900 rounded-2xl flex flex-col gap-4 text-xs relative overflow-hidden"
                      >
                        {/* Header info */}
                        <div className="flex justify-between items-start border-b border-slate-950 pb-3">
                          <div>
                            <span className="font-bold text-slate-200 text-sm block">{draw.lotteryName}</span>
                            <span className="text-[10px] text-slate-500">
                              {drawDate.toLocaleDateString("es-ES", {
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric'
                              })} - {drawDate.toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-mono font-black text-lg shadow-lg shadow-yellow-500/5" title="Número Ganador">
                            {draw.winningNumber}
                          </div>
                        </div>

                        {/* Config details */}
                        <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-3 rounded-xl border border-slate-900/50">
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Configuración:</p>
                            <div className="text-slate-300">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Precio Ticket:</span>
                                <span className="font-semibold">${formatCOP(draw.ticketPrice)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Premios:</p>
                            <div className="text-slate-300 space-y-0.5">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Mayor:</span>
                                <span className="font-bold text-yellow-400/90">${formatCOP(draw.prizeMayor)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Secundario:</span>
                                <span className="font-semibold text-indigo-400">${formatCOP(draw.prizeSecundario)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Consolación:</span>
                                <span className="font-semibold text-violet-400">${formatCOP(draw.prizeConsolacion)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Winners list */}
                        <div className="space-y-2 flex-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ganadores:</p>
                          {parsedWinners.length === 0 ? (
                            <p className="text-slate-600 italic py-1">Sin ganadores en este sorteo</p>
                          ) : (
                            <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1 border border-slate-900/30 rounded-lg p-2 bg-slate-950/20">
                              {parsedWinners.map((winner, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-slate-900/30 p-2 rounded-lg border border-slate-900/60">
                                  <div>
                                    <span className="font-semibold text-slate-300 block truncate max-w-[150px]" title={winner.email}>
                                      {winner.email}
                                    </span>
                                    <span className="text-[10px] text-slate-500">Ticket: #{winner.number}</span>
                                  </div>
                                  <div className="flex flex-col items-end gap-0.5">
                                    {winner.prizes.map((p, pIdx) => (
                                      <span 
                                        key={pIdx} 
                                        className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full ${
                                          p === "Premio Mayor" 
                                            ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" 
                                            : p === "Premio Secundario" 
                                            ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                                            : "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                                        }`}
                                      >
                                        {p}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Collapsible Claims Section */}
                        {(() => {
                          const drawClaims = claims.filter(claim => claim.raffleId === draw.drawnAt);
                          return (
                            <div className="pt-3 border-t border-slate-950/60 mt-2 space-y-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedDrawClaims(prev => ({
                                    ...prev,
                                    [draw.id]: !prev[draw.id]
                                  }));
                                }}
                                className="w-full py-1.5 px-3 bg-slate-900 border border-slate-800 text-indigo-400 hover:text-indigo-300 font-bold rounded-lg transition-all text-[11px] flex items-center justify-center gap-1"
                              >
                                {expandedDrawClaims[draw.id] ? "Ocultar Reclamaciones" : `Ver Reclamaciones (${drawClaims.length})`}
                              </button>

                              {expandedDrawClaims[draw.id] && (
                                <div className="space-y-3 pt-2 animate-fade-in">
                                  {drawClaims.length === 0 ? (
                                    <p className="text-slate-600 italic text-[11px] text-center py-1">No hubo reclamaciones por transferencia en este sorteo</p>
                                  ) : (
                                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                                      {drawClaims.map((claim) => (
                                        <div key={claim.id} className="p-3 bg-slate-950/30 border border-slate-950 rounded-xl space-y-2.5">
                                          <div className="flex justify-between items-center border-b border-slate-950/40 pb-1.5">
                                            <span className="font-bold text-slate-300 truncate max-w-[120px]" title={claim.user?.email}>
                                              {claim.user?.email}
                                            </span>
                                            {claim.status === "PENDING" && (
                                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Pendiente</span>
                                            )}
                                            {claim.status === "PAID" && (
                                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Pagado</span>
                                            )}
                                            {claim.status === "REJECTED" && (
                                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">Rechazado</span>
                                            )}
                                          </div>

                                          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                                            <div>
                                              <span className="text-slate-500 block">Monto:</span>
                                              <span className="font-bold text-emerald-400">${formatCOP(claim.totalAmount)}</span>
                                            </div>
                                            <div>
                                              <span className="text-slate-500 block">Banco:</span>
                                              <span className="font-semibold text-slate-300">{claim.bankName}</span>
                                            </div>
                                            <div className="col-span-2">
                                              <span className="text-slate-500 block">Cuenta:</span>
                                              <span className="font-mono text-slate-300">{claim.accountNumber} ({claim.accountType})</span>
                                            </div>
                                            <div className="col-span-2">
                                              <span className="text-slate-500 block">Titular:</span>
                                              <span className="text-slate-300">{claim.accountHolder} - {claim.documentNumber}</span>
                                            </div>
                                          </div>

                                          {/* Notes */}
                                          {(claim.rejectionReason || claim.clientNote) && (
                                            <div className="space-y-1.5 pt-1.5 border-t border-slate-950/40 text-[9px]">
                                              {claim.rejectionReason && (
                                                <div className="text-rose-400 italic">
                                                  <strong>Motivo Rechazo:</strong> &quot;{claim.rejectionReason}&quot;
                                                </div>
                                              )}
                                              {claim.clientNote && (
                                                <div className="text-indigo-300 italic">
                                                  <strong>Aclaración Cliente:</strong> &quot;{claim.clientNote}&quot;
                                                </div>
                                              )}
                                            </div>
                                          )}

                                          {/* Actions inside history claim */}
                                          {(claim.status === "PENDING" || (claim.status === "REJECTED" && claim.clientNote)) && (
                                            <div className="flex justify-end gap-1.5 pt-1.5 border-t border-slate-950/40">
                                              <button
                                                type="button"
                                                onClick={() => handleClaimAction(claim.id, "PAID")}
                                                disabled={actionLoading}
                                                className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold rounded text-[9px] flex items-center gap-0.5 transition-all"
                                              >
                                                <Check size={10} /> Pagado
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleClaimAction(claim.id, "REJECTED")}
                                                disabled={actionLoading}
                                                className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 font-bold rounded text-[9px] flex items-center gap-0.5 transition-all"
                                              >
                                                <X size={10} /> Rechazar
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

      </main>

      <footer className="glass-panel border-t border-slate-900 mt-12 py-6 text-center text-xs text-slate-500">
        <p>© 2026 Panel de Control Lottocien. Uso Exclusivo del Administrador.</p>
      </footer>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { 
  Trophy, 
  Sparkles, 
  CreditCard, 
  User, 
  LogOut, 
  ShieldAlert, 
  Info, 
  CheckCircle2, 
  Clock, 
  UserCheck,
  Upload,
  FileText,
  Building,
  CheckCircle,
  XCircle,
  X,
  Copy
} from "lucide-react";

interface WompiWidget {
  open: (callback: (result: { transaction?: { id: string; status: string } }) => void) => void;
}

interface CustomWindow extends Window {
  WidgetCheckout?: new (config: {
    currency: string;
    amountInCents: number;
    reference: string;
    publicKey: string;
    redirectUrl: string;
    signature: string;
    customerData: { email: string };
  }) => WompiWidget;
}

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

interface RaffleState {
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
  showDrawWarning: boolean;
  showDrawHistory: boolean;
  bankName: string;
  accountNumber: string;
  accountType: string;
  accountHolder: string;
}

const formatCOP = (val: number): string => {
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export default function Dashboard() {
  const { user, token, logout } = useAuth();
  
  // State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [raffleState, setRaffleState] = useState<RaffleState | null>(null);
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"WOMPI" | "TRANSFER">("TRANSFER");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Cargando números...");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Claim prize states
  const [currentClaim, setCurrentClaim] = useState<{
    id: string;
    bankName: string;
    accountNumber: string;
    accountType: string;
    accountHolder: string;
    documentNumber: string;
    status: string;
    rejectionReason: string | null;
    clientNote: string | null;
  } | null>(null);

  const [claimBankName, setClaimBankName] = useState("");
  const [claimAccountNumber, setClaimAccountNumber] = useState("");
  const [claimAccountType, setClaimAccountType] = useState("Ahorros");
  const [claimAccountHolder, setClaimAccountHolder] = useState("");
  const [claimDocumentNumber, setClaimDocumentNumber] = useState("");
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimError, setClaimError] = useState("");

  // Clarification States
  const [clarifyNoteInput, setClarifyNoteInput] = useState("");
  const [clarifyLoading, setClarifyLoading] = useState(false);
  const [clarifySuccess, setClarifySuccess] = useState(false);
  const [clarifyError, setClarifyError] = useState("");

  // Persist selected numbers in localStorage so they survive login redirection
  useEffect(() => {
    const stored = localStorage.getItem("lottocien_selected_numbers");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setTimeout(() => {
          setSelectedNumbers(parsed);
        }, 0);
      } catch (e) {
        console.error("Error al cargar números seleccionados:", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("lottocien_selected_numbers", JSON.stringify(selectedNumbers));
  }, [selectedNumbers]);

  const fetchClaimStatus = useCallback(async () => {
    if (!token) {
      setCurrentClaim(null);
      return;
    }
    try {
      const response = await fetch("/api/tickets/claim-prize", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentClaim(data.claim);
      }
    } catch (err) {
      console.error("Error fetching claim status:", err);
    }
  }, [token]);

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setClaimLoading(true);
    setClaimError("");
    setClaimSuccess(false);

    try {
      const response = await fetch("/api/tickets/claim-prize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bankName: claimBankName,
          accountNumber: claimAccountNumber,
          accountType: claimAccountType,
          accountHolder: claimAccountHolder,
          documentNumber: claimDocumentNumber,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Error al enviar la solicitud de premio.");
      }

      setClaimSuccess(true);
      setClaimBankName("");
      setClaimAccountNumber("");
      setClaimAccountHolder("");
      setClaimDocumentNumber("");
      
      // Refresh claim status from server
      await fetchClaimStatus();
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Error al procesar el reclamo de premio.";
      setClaimError(errorMessage);
    } finally {
      setClaimLoading(false);
    }
  };

  const handleClarifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setClarifyLoading(true);
    setClarifyError("");
    setClarifySuccess(false);

    try {
      const response = await fetch("/api/tickets/claim-prize/clarify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientNote: clarifyNoteInput,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Error al enviar la aclaración.");
      }

      setClarifySuccess(true);
      setClarifyNoteInput("");
      // Refresh claim status to display the updated clientNote
      await fetchClaimStatus();
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Error al procesar el envío de la aclaración.";
      setClarifyError(errorMessage);
    } finally {
      setClarifyLoading(false);
    }
  };

  const TICKET_PRICE_COP = raffleState?.ticketPrice || 15000;

  // Fetch all tickets from API (with automatic retry for cold starts)
  const fetchTickets = useCallback(async () => {
    let attempts = 0;
    const maxAttempts = 5;
    
    const tryFetch = async (): Promise<boolean> => {
      try {
        setError("");
        const response = await fetch("/api/tickets", { cache: "no-store" });
        if (!response.ok) throw new Error("Error al obtener tickets");
        const data = await response.json();
        setTickets(data.tickets);
        setRaffleState(data.raffleState);
        if (data.raffleState && !data.raffleState.wompiEnabled) {
          setPaymentMethod("TRANSFER");
        }

        // Filter out selected numbers that are no longer AVAILABLE
        setSelectedNumbers((prev) => {
          const availableSet = new Set(
            data.tickets
              .filter((t: Ticket) => t.status === "AVAILABLE")
              .map((t: Ticket) => t.number)
          );
          const filtered = prev.filter((num) => availableSet.has(num));
          if (filtered.length !== prev.length) {
            return filtered;
          }
          return prev;
        });
        return true;
      } catch (err) {
        attempts++;
        console.warn(`Intento ${attempts} fallido al cargar tickets:`, err);
        if (attempts < maxAttempts) {
          setLoadingMessage("El servidor de Railway está despertando de su inactividad. Por favor espera de 2 a 5 segundos...");
          // Wait 3 seconds before retrying
          await new Promise((resolve) => setTimeout(resolve, 3000));
          return await tryFetch();
        }
        setError("No se pudo conectar con el servidor de la rifa. Por favor, recarga la página.");
        return false;
      }
    };

    setLoading(true);
    setLoadingMessage("Cargando números...");
    await tryFetch();
    setLoading(false);
  }, []);

  // Poll for tickets status and claim status updates every 15 seconds to sync other users' actions
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTickets();
      if (token) {
        fetchClaimStatus();
      }
    }, 0);

    const interval = setInterval(() => {
      fetchTickets();
      if (token) {
        fetchClaimStatus();
      }
    }, 15000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchTickets, fetchClaimStatus, token]);

  // Handle number click selection (toggling multi-selection)
  const handleSelectNumber = (number: string, ticketStatus: string) => {
    if (ticketStatus !== "AVAILABLE") return;
    if (raffleState?.winningNumber) return; // Disallow selection if draw has finished
    
    setSelectedNumbers((prev) => 
      prev.includes(number)
        ? prev.filter((num) => num !== number)
        : [...prev, number]
    );
    setError("");
    setSuccessMessage("");
  };

  // Handle file input selection for Bank Transfer
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Mime-type check
      const allowedMimes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (!allowedMimes.includes(selectedFile.type)) {
        setError("Tipo de archivo inválido. Sube una imagen (JPG, PNG, WEBP) o un PDF.");
        setReceiptFile(null);
        return;
      }

      // Size check (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("El archivo supera el límite de 5MB.");
        setReceiptFile(null);
        return;
      }

      setError("");
      setReceiptFile(selectedFile);
    }
  };

  // Initiate purchase flow
  const handlePurchase = async () => {
    if (!user || !token) {
      setError("Debes iniciar sesión para comprar números.");
      return;
    }
    if (selectedNumbers.length === 0) return;

    setError("");
    setSuccessMessage("");
    setPaymentLoading(true);

    try {
      if (paymentMethod === "WOMPI") {
        if (raffleState?.wompiEnabled === false) {
          throw new Error("El pago por Wompi está temporalmente deshabilitado.");
        }
        // --- WOMPI CHECKOUT ---
        
        // 1. Call reservation endpoint to lock selected tickets for 10 minutes
        const reserveResponse = await fetch("/api/tickets/reserve", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ numbers: selectedNumbers }),
        });

        const reserveData = await reserveResponse.json();
        if (!reserveResponse.ok) {
          throw new Error(reserveData.error || "No se pudo reservar los números.");
        }

        const totalAmount = selectedNumbers.length * TICKET_PRICE_COP;
        const amountInCents = totalAmount * 100;
        const transactionRef = reserveData.transactionRef;

        // 2. Generate the integrity signature from the backend
        const signatureResponse = await fetch("/api/wompi/signature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference: transactionRef,
            amountInCents,
            currency: "COP",
          }),
        });

        const signatureData = await signatureResponse.json();
        if (!signatureResponse.ok) {
          throw new Error("Error al generar firma de seguridad para el pago.");
        }

        const integritySignature = signatureData.signature;
        const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || "pub_test_Q5yDA9zJzUph7szkth4Z15Wv12H29Z4s";

        // 3. Open Wompi checkout widget
        const customWindow = typeof window !== "undefined" ? (window as unknown as CustomWindow) : null;
        if (customWindow && customWindow.WidgetCheckout) {
          const checkout = new customWindow.WidgetCheckout({
            currency: "COP",
            amountInCents,
            reference: transactionRef,
            publicKey,
            redirectUrl: window.location.origin + "?payment=confirm",
            signature: integritySignature,
            customerData: {
              email: user.email,
            },
          });

          checkout.open(async (result) => {
            const tx = result?.transaction;
            console.log("Transacción de Wompi finalizada en el widget:", tx);
            await fetchTickets();
            setSelectedNumbers([]);
            setSuccessMessage("Transacción de pago iniciada. Revisa el estado de tus números en la grilla.");
          });
        } else {
          throw new Error("El Widget de Wompi no se cargó correctamente. Recarga la página.");
        }

      } else {
        // --- BANK TRANSFER CHECKOUT (CON COMPROBANTE A CLOUDFLARE R2) ---
        if (!receiptFile) {
          throw new Error("Por favor, adjunta una foto o documento del comprobante de transferencia.");
        }

        // 1. Reserve the tickets first
        const reserveResponse = await fetch("/api/tickets/reserve", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ numbers: selectedNumbers }),
        });

        const reserveData = await reserveResponse.json();
        if (!reserveResponse.ok) {
          throw new Error(reserveData.error || "No se pudo realizar la reserva temporal.");
        }

        const transactionRef = reserveData.transactionRef;

        // 2. Upload receipt to R2 and trigger admin email
        const formData = new FormData();
        formData.append("file", receiptFile);
        formData.append("transactionRef", transactionRef);

        const uploadResponse = await fetch("/api/tickets/upload-receipt", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) {
          throw new Error(uploadData.error || "Error al subir el comprobante de pago.");
        }

        // 3. Complete Flow
        await fetchTickets();
        setSelectedNumbers([]);
        setReceiptFile(null);
        setSuccessMessage("¡Comprobante enviado con éxito! El administrador validará tu transferencia pronto.");
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al procesar el pago.";
      setError(errorMessage);
      fetchTickets();
    } finally {
      setPaymentLoading(false);
    }
  };

  // Find winning classes
  const isWinningTicket = (num: string): string[] => {
    if (!raffleState?.winningNumber) return [];
    
    const winningNum = raffleState.winningNumber;
    const mayor = winningNum.slice(2, 4);
    const secundario = winningNum.slice(0, 2);
    const consolacion = winningNum.slice(1, 3);
    
    const prizes = [];
    if (num === mayor) prizes.push("Premio Mayor");
    if (num === secundario) prizes.push("Premio Secundario");
    if (num === consolacion) prizes.push("Premio de Consolación");
    
    return prizes;
  };

  // Sales stats calculations
  const soldTicketsCount = tickets.filter(t => t.status === "SOLD").length;
  const soldPercentage = Math.round((soldTicketsCount / 100) * 100);
  const isGoalReached = soldPercentage >= 80;
  const formattedDrawDate = raffleState?.drawDate
    ? new Date(raffleState.drawDate).toLocaleDateString("es-ES", {
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      }) + " a las " + new Date(raffleState.drawDate).toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit' })
    : null;

  // Filter my active tickets (either approved sold or pending approval)
  const myPurchasedTickets = tickets.filter(t => t.userId === user?.id && t.status === "SOLD");
  const myPendingApprovalTickets = tickets.filter(t => t.userId === user?.id && t.status === "PENDING_APPROVAL");
  const totalMyTickets = myPurchasedTickets.length + myPendingApprovalTickets.length;

  // Calculate winning tickets for the client
  const clientWinnings = myPurchasedTickets.map(t => {
    const prizes = isWinningTicket(t.number);
    const value = prizes.reduce((sum, p) => {
      if (p === "Premio Mayor") return sum + (raffleState?.prizeMayor || 700000);
      if (p === "Premio Secundario") return sum + (raffleState?.prizeSecundario || 200000);
      if (p === "Premio de Consolación") return sum + (raffleState?.prizeConsolacion || 100000);
      return sum;
    }, 0);
    return {
      number: t.number,
      prizes,
      value
    };
  }).filter(w => w.prizes.length > 0);

  const totalWinningValue = clientWinnings.reduce((sum, w) => sum + w.value, 0);
  const hasWon = clientWinnings.length > 0;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Decorative neon lights */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -z-10" />

      {/* HEADER NAVBAR */}
      <header className="glass-panel border-b border-slate-900 sticky top-0 z-50 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden bg-slate-900/50 border border-slate-800/80 p-1 flex items-center justify-center transition-all duration-300 group-hover:border-emerald-500/40 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <img 
                src="https://cdn.lottocien.com/Icono%20Isotipo%20Redondo.png" 
                alt="Lottocien Isotipo" 
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-extrabold text-2xl sm:text-3xl tracking-wider bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent transition-all duration-300 group-hover:brightness-110">
                Lottocien
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold mt-0.5">
                Rifa Semanal
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
                  <User size={13} className="text-emerald-400" />
                  {user.email}
                </span>
                
                {user.role === "ADMIN" && (
                  <Link 
                    href="/admin" 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all text-xs font-semibold text-indigo-300"
                  >
                    <ShieldAlert size={14} />
                    Panel Admin
                  </Link>
                )}
                
                <button
                  onClick={logout}
                  className="flex items-center gap-1 p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-rose-400 hover:text-rose-300 transition-all text-xs font-semibold"
                  title="Cerrar Sesión"
                >
                  <LogOut size={14} />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold hover:scale-105 active:scale-95 transition-all text-sm shadow-lg shadow-emerald-500/20"
              >
                Iniciar Sesión
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: RAFFLE BANNER & 10X10 GRID (8 COLS) */}
        <section className="lg:col-span-8 space-y-6">
          {/* HERO BANNER IMAGE */}
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-900 aspect-[21/9] sm:aspect-[3/1] bg-slate-950">
            <img
              src="https://pub-d95ed340d76246ea8bea59c54320eb54.r2.dev/Banner%20Hero.png"
              alt="Lottocien Banner"
              className="w-full h-full object-cover"
            />
          </div>

          {/* WINNER CONGRATULATIONS & CLAIM FORM */}
          {hasWon && (
            <div className="glass-panel rounded-2xl p-6 border-2 border-emerald-500/30 relative overflow-hidden shadow-2xl bg-gradient-to-r from-slate-950 via-emerald-950/10 to-slate-950 animate-scale-up">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex flex-col md:flex-row items-stretch gap-6">
                <div className="flex-1 w-full space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
                      <Trophy size={28} className="animate-bounce" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        ¡Felicitaciones! Eres Ganador 🎉
                      </h2>
                      <p className="text-xs text-slate-400">
                        Has acertado los números del sorteo con tus tickets de la suerte.
                      </p>
                    </div>
                  </div>

              {/* Winnings details table */}
              <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800/80 mb-6 text-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Resumen de Premios:</p>
                <div className="space-y-2">
                  {clientWinnings.map((w, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1.5 border-b border-slate-800/50 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20 text-xs">
                          {w.number}
                        </span>
                        <span className="text-xs text-slate-300">({w.prizes.join(", ")})</span>
                      </div>
                      <span className="font-extrabold text-emerald-400">
                        ${formatCOP(w.value)} COP
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-3 mt-1 border-t border-slate-700 font-bold text-base">
                    <span className="text-slate-200">Total a Reclamar:</span>
                    <span className="text-emerald-400 text-lg font-black">
                      ${formatCOP(totalWinningValue)} COP
                    </span>
                  </div>
                </div>
              </div>

              {/* Form or Status card */}
              {currentClaim ? (
                <div className="space-y-4">
                  {/* Status Badge */}
                  <div className="pt-4 border-t border-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
                      <CreditCard size={15} className="text-indigo-400" />
                      Estado de tu Reclamación:
                    </h3>
                    {currentClaim.status === "PENDING" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Clock size={13} className="animate-pulse" />
                        Pendiente de Validación
                      </span>
                    )}
                    {currentClaim.status === "PAID" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle size={13} />
                        Pagado / Transferido
                      </span>
                    )}
                    {currentClaim.status === "REJECTED" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <XCircle size={13} />
                        Rechazado
                      </span>
                    )}
                  </div>

                  {/* Message depending on status */}
                  <div className="bg-slate-900/40 rounded-xl p-4 border border-slate-900 text-xs text-slate-400 leading-relaxed">
                    {currentClaim.status === "PENDING" && (
                      <p>
                        El administrador ha recibido tus datos bancarios y está en proceso de verificar la información para realizar la transferencia bancaria. Se te enviará una notificación cuando se procese.
                      </p>
                    )}
                    {currentClaim.status === "PAID" && (
                      <p className="text-emerald-300/90 font-medium">
                        ¡Felicidades! Tu premio ha sido pagado. El administrador confirmó la transferencia correspondiente a los datos bancarios indicados abajo.
                      </p>
                    )}
                    {currentClaim.status === "REJECTED" && (
                      <div className="space-y-1.5">
                        <p className="text-rose-300/95 font-medium">
                          Esta reclamación ha sido rechazada por el administrador.
                        </p>
                        {currentClaim.rejectionReason && (
                          <div className="mt-1 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20 text-rose-300 font-semibold">
                            Motivo del rechazo: &quot;{currentClaim.rejectionReason}&quot;
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Submitted Bank Details Summary */}
                  <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800/80 text-xs space-y-2">
                    <p className="font-bold text-slate-300 flex items-center gap-1">
                      <Building size={12} className="text-indigo-400" />
                      Datos Bancarios Registrados:
                    </p>
                    <table className="w-full text-slate-300 border-collapse">
                      <tbody>
                        <tr className="border-b border-slate-800/50">
                          <td className="text-slate-500 py-1.5">Banco:</td>
                          <td className="font-semibold text-slate-200 text-right">{currentClaim.bankName}</td>
                        </tr>
                        <tr className="border-b border-slate-800/50">
                          <td className="text-slate-500 py-1.5">Número de Cuenta:</td>
                          <td className="font-mono font-semibold text-slate-200 text-right">{currentClaim.accountNumber}</td>
                        </tr>
                        <tr className="border-b border-slate-800/50">
                          <td className="text-slate-500 py-1.5">Tipo de Cuenta:</td>
                          <td className="font-semibold text-slate-200 text-right">{currentClaim.accountType}</td>
                        </tr>
                        <tr className="border-b border-slate-800/50">
                          <td className="text-slate-500 py-1.5">Titular:</td>
                          <td className="font-semibold text-slate-200 text-right">{currentClaim.accountHolder}</td>
                        </tr>
                        <tr>
                          <td className="text-slate-500 py-1.5">Documento de Identidad:</td>
                          <td className="font-mono font-semibold text-slate-200 text-right">{currentClaim.documentNumber}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {currentClaim.status === "REJECTED" && (
                    <div className="pt-2 border-t border-slate-900/60">
                      {currentClaim.clientNote ? (
                        <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 text-xs space-y-1.5">
                          <p className="font-bold text-indigo-300 flex items-center gap-1">
                            <FileText size={12} />
                            Nota Aclaratoria Enviada:
                          </p>
                          <p className="text-slate-300 italic whitespace-pre-wrap bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/85">
                            &quot;{currentClaim.clientNote}&quot;
                          </p>
                          <p className="text-[10px] text-slate-500">
                            La aclaración fue recibida y está en espera de revisión por el administrador.
                          </p>
                        </div>
                      ) : (
                        <form onSubmit={handleClarifySubmit} className="space-y-3">
                          <p className="font-bold text-xs text-slate-300">
                            ¿Deseas enviar una nota aclaratoria o corregir datos?
                          </p>
                          
                          {clarifyError && (
                            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-400 text-xs">
                              {clarifyError}
                            </div>
                          )}

                          {clarifySuccess && (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-emerald-400 text-xs">
                              Nota aclaratoria enviada con éxito.
                            </div>
                          )}

                          <textarea
                            required
                            value={clarifyNoteInput}
                            onChange={(e) => setClarifyNoteInput(e.target.value)}
                            placeholder="Escribe aquí tu aclaración (ej: corregir número de cuenta o banco)..."
                            className="w-full h-24 bg-slate-900/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none transition-all leading-relaxed"
                          />

                          <button
                            type="submit"
                            disabled={clarifyLoading}
                            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-slate-100 font-bold py-2 px-3 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-40"
                          >
                            {clarifyLoading ? (
                              <div className="w-4 h-4 border-2 border-slate-100 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <FileText size={13} />
                                Enviar Aclaración al Administrador
                              </>
                            )}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              ) : claimSuccess ? (
                <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-5 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={24} />
                  </div>
                  <h3 className="font-bold text-slate-100 text-base">¡Solicitud Enviada con Éxito!</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Tus datos bancarios han sido enviados al administrador. El pago de tu premio se procesará mediante transferencia bancaria a la brevedad.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleClaimSubmit} className="space-y-4">
                  <div className="border-t border-slate-900 pt-4">
                    <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-1.5">
                      <CreditCard size={15} className="text-indigo-400" />
                      Introduce tus Datos Bancarios para recibir tu Premio:
                    </h3>
                    
                    {claimError && (
                      <div className="mb-4 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex items-start gap-2.5 text-rose-400 text-xs">
                        <Info size={16} className="shrink-0 mt-0.5" />
                        <span>{claimError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Bank Name */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Banco:
                        </label>
                        <input
                          type="text"
                          required
                          value={claimBankName}
                          onChange={(e) => setClaimBankName(e.target.value)}
                          placeholder="Ej. Bancolombia, Davivienda, Nequi..."
                          className="w-full bg-slate-900/80 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none transition-all"
                        />
                      </div>

                      {/* Account Number */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Número de Cuenta:
                        </label>
                        <input
                          type="text"
                          required
                          value={claimAccountNumber}
                          onChange={(e) => setClaimAccountNumber(e.target.value)}
                          placeholder="Ej. 1234567890"
                          className="w-full bg-slate-900/80 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none transition-all"
                        />
                      </div>

                      {/* Account Type */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Tipo de Cuenta:
                        </label>
                        <select
                          value={claimAccountType}
                          onChange={(e) => setClaimAccountType(e.target.value)}
                          className="w-full bg-slate-900/80 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none transition-all"
                        >
                          <option value="Ahorros">Ahorros</option>
                          <option value="Corriente">Corriente</option>
                        </select>
                      </div>

                      {/* Account Holder Name */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Nombre del Titular:
                        </label>
                        <input
                          type="text"
                          required
                          value={claimAccountHolder}
                          onChange={(e) => setClaimAccountHolder(e.target.value)}
                          placeholder="Ej. Juan Pérez"
                          className="w-full bg-slate-900/80 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none transition-all"
                        />
                      </div>

                      {/* ID Document Number */}
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Documento de Identidad (C.C., NIT, etc.):
                        </label>
                        <input
                          type="text"
                          required
                          value={claimDocumentNumber}
                          onChange={(e) => setClaimDocumentNumber(e.target.value)}
                          placeholder="Ej. C.C. 1.234.567.890"
                          className="w-full bg-slate-900/80 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={claimLoading}
                      className="w-full mt-5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold py-3 px-4 rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {claimLoading ? (
                        <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 size={18} />
                          Enviar Reclamación de Premio
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
                </div>

                {/* Right Column: Floating Trophy Illustration */}
                <div className="hidden md:flex flex-col items-center justify-center w-52 shrink-0 self-center bg-slate-900/40 rounded-2xl border border-emerald-500/10 p-5 gap-3">
                  <div className="relative w-36 h-36">
                    <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl animate-pulse" />
                    <img
                      src="https://cdn.lottocien.com/Ilustraci%C3%B3n%20de%20Premio.png"
                      alt="Trofeo Ganador"
                      className="w-full h-full object-contain relative z-10 animate-pulse"
                    />
                  </div>
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-widest text-center">
                    ¡Felicidades!
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold text-center leading-normal">
                    Tu premio está listo para ser transferido
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* RAFFLE STATUS BANNER */}
          <div className="glass-panel rounded-2xl p-6 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-3">
              <Sparkles className="text-emerald-400 animate-pulse" size={24} />
            </div>

            {raffleState?.winningNumber ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm uppercase tracking-widest mb-1">
                    <Trophy size={16} />
                    ¡Sorteo Finalizado!
                  </div>
                  <h2 className="text-xl font-bold text-slate-100">
                    Se ha registrado el número ganador de la lotería de esta semana.
                  </h2>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-yellow-400 text-slate-950 font-extrabold text-4xl px-8 py-3.5 rounded-2xl tracking-widest shadow-lg shadow-amber-500/20">
                  {raffleState.winningNumber}
                </div>
              </div>
            ) : (
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
                  Sorteo Activo
                </span>
                <h2 className="text-2xl font-bold text-slate-500 font-sans">
                  Selecciona tus números de la Cuadricula inferior. 
                  <span className="text-slate-100 block mt-1">
                    ¡Tienes 3 formas de ganar por cada ticket de {raffleState?.ticketPrice ? `$${formatCOP(raffleState.ticketPrice)}` : "$15.000"} Pesos!
                  </span>
                </h2>
              </div>
            )}
          </div>

          {/* RAFFLE INSTRUCTIONS / PRIZE BREAKDOWN */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-panel p-3 rounded-xl border-l-4 border-l-amber-500 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Premio Mayor</p>
              <p className="text-xs font-extrabold text-slate-200">2 Últimas cifras</p>
              <p className="text-[10px] text-emerald-400 font-bold mt-1">
                Gana {raffleState?.prizeMayor ? `$${formatCOP(raffleState.prizeMayor)}` : "70%"}
              </p>
            </div>
            <div className="glass-panel p-3 rounded-xl border-l-4 border-l-indigo-500 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Premio Secundario</p>
              <p className="text-xs font-extrabold text-slate-200">2 Primeras cifras</p>
              <p className="text-[10px] text-indigo-400 font-bold mt-1">
                Gana {raffleState?.prizeSecundario ? `$${formatCOP(raffleState.prizeSecundario)}` : "20%"}
              </p>
            </div>
            <div className="glass-panel p-3 rounded-xl border-l-4 border-l-violet-500 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Consolación</p>
              <p className="text-xs font-extrabold text-slate-200">2 Cifras del medio</p>
              <p className="text-[10px] text-violet-400 font-bold mt-1">
                Gana {raffleState?.prizeConsolacion ? `$${formatCOP(raffleState.prizeConsolacion)}` : "10%"}
              </p>
            </div>
          </div>

          {/* 10X10 GRID CARD */}
          <div className="glass-panel rounded-2xl p-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="font-bold text-lg text-slate-200 flex items-center gap-2">
                Cuadrícula de Números
              </h3>
              {/* Legend */}
              <div className="flex flex-wrap gap-3.5 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500" /> Disp.
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500" /> Selecc.
                </span>
                <span className="flex items-center gap-1.5 text-violet-400">
                  <span className="w-3 h-3 rounded bg-violet-500/20 border border-violet-500" /> Reservado
                </span>
                <span className="flex items-center gap-1.5 text-orange-400">
                  <span className="w-3 h-3 rounded bg-orange-500/20 border border-orange-500" /> En Validación
                </span>
                <span className="flex items-center gap-1.5 text-rose-500">
                  <span className="w-3 h-3 rounded bg-slate-900 border border-slate-900 opacity-50" /> Vendido
                </span>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 px-6 text-center">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-400 text-sm font-medium max-w-md">{loadingMessage}</p>
              </div>
            ) : (
              <div className="grid grid-cols-10 gap-2 sm:gap-2.5 aspect-square">
                {tickets.map((ticket) => {
                  const numStr = ticket.number;
                  const isSelected = selectedNumbers.includes(numStr);
                  const isPending = ticket.status === "PENDING";
                  const isPendingApproval = ticket.status === "PENDING_APPROVAL";
                  const isSold = ticket.status === "SOLD";
                  const prizes = isWinningTicket(numStr);
                  const isWinner = prizes.length > 0;

                  let cellClass = "glow-available bg-emerald-950/10 text-emerald-400 border border-emerald-500/20";
                  
                  if (isWinner) {
                    cellClass = "glow-winner bg-yellow-500 text-slate-950 font-black border-yellow-400";
                  } else if (isSelected) {
                    cellClass = "glow-selected bg-amber-500/30 text-amber-300 font-bold border-amber-500";
                  } else if (isPendingApproval) {
                    cellClass = "glow-pending-approval bg-orange-950/20 text-orange-400 border-orange-500/30 cursor-not-allowed";
                  } else if (isPending) {
                    cellClass = "glow-pending bg-violet-950/20 text-violet-400 border-violet-500/30 cursor-not-allowed";
                  } else if (isSold) {
                    cellClass = "glow-sold bg-slate-900 text-slate-600 border-slate-900 cursor-not-allowed opacity-50";
                  }

                  return (
                    <button
                      key={numStr}
                      disabled={isSold || isPending || isPendingApproval || !!raffleState?.winningNumber}
                      onClick={() => handleSelectNumber(numStr, ticket.status)}
                      className={`relative flex items-center justify-center rounded-lg sm:rounded-xl text-sm sm:text-base font-bold transition-all select-none ${cellClass} h-full w-full aspect-square`}
                      title={`Número ${numStr} - ${ticket.status}`}
                    >
                      {numStr}
                      {isWinner && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Subtle Sales Percentage Meter at the bottom */}
            <div className="mt-6 pt-4 border-t border-slate-900 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>Progreso de Ventas:</span>
                <span className={`font-bold ${isGoalReached ? "text-emerald-400" : "text-amber-500"}`}>
                  {soldPercentage}% Vendido ({soldTicketsCount} / 100)
                </span>
              </div>
              
              {/* Progress Bar (Simple & Subtle) */}
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    isGoalReached ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${soldPercentage}%` }}
                />
              </div>

              {/* Status / Alerts */}
              {isGoalReached ? (
                <p className="text-[10px] text-emerald-500/90 font-medium">
                  ✓ Meta mínima del 80% alcanzada. El sorteo se ejecutará en la fecha programada.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {raffleState?.showDrawWarning !== false && (
                    <p className="text-[10px] text-amber-500/90 leading-relaxed italic bg-amber-500/5 p-2 rounded border border-amber-500/10">
                      <strong>Aviso:</strong> {raffleState?.drawWarningMessage || "Se requiere el 80% de los números vendidos para jugar."}
                    </p>
                  )}
                  {formattedDrawDate && (
                    <p className="text-[10px] text-slate-500">
                      Sorteo programado para: <span className="text-slate-300">{formattedDrawDate}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: DETAIL PANEL / BUY FLOW (4 COLS) */}
        <section className="lg:col-span-4 space-y-6">
          {/* USER TICKETS CARD */}
          {user && (
            <div className="glass-panel rounded-2xl p-6 shadow-2xl">
              <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                <UserCheck size={18} className="text-indigo-400" />
                Mis Tickets esta Semana
              </h3>
              
              {totalMyTickets === 0 ? (
                <p className="text-slate-400 text-sm">Aún no tienes tickets registrados en este sorteo.</p>
              ) : (
                <div className="space-y-4">
                  {/* Confirmed Tickets */}
                  {myPurchasedTickets.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle size={12} /> Confirmados:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {myPurchasedTickets.map((t) => {
                          const prizes = isWinningTicket(t.number);
                          const isWinner = prizes.length > 0;
                          return (
                            <div
                              key={t.number}
                              className={`px-3 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${
                                isWinner 
                                  ? "bg-yellow-500 text-slate-950 border-yellow-400 animate-pulse" 
                                  : "bg-slate-900 text-slate-300 border-slate-800"
                              }`}
                            >
                              <span>{t.number}</span>
                              {isWinner && (
                                <span title={prizes.join(", ")}>
                                  <Trophy size={11} />
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Pending Approval Tickets */}
                  {myPendingApprovalTickets.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-900">
                      <p className="text-[11px] text-orange-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Clock size={12} /> En validación de pago:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {myPendingApprovalTickets.map((t) => (
                          <div
                            key={t.number}
                            className="px-3 py-1 rounded-lg border bg-orange-950/20 text-orange-300 border-orange-500/20 text-xs font-bold"
                          >
                            {t.number}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PURCHASE PANEL */}
          <div className="glass-panel rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
              <CreditCard size={18} className="text-emerald-400" />
              Adquisición de Tickets
            </h3>

            {error && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex items-start gap-2.5 text-rose-400 text-xs">
                <Info size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-start gap-2.5 text-emerald-400 text-xs">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {selectedNumbers.length > 0 ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center py-4 border-y border-slate-900">
                  <div className="max-w-[60%]">
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                      Números Elegidos
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedNumbers.map((num) => (
                        <span key={num} className="font-extrabold text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                          {num}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                      Total a Pagar
                    </span>
                    <span className="font-extrabold text-xl text-slate-200 block">
                      ${formatCOP(selectedNumbers.length * TICKET_PRICE_COP)} COP
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {selectedNumbers.length} {selectedNumbers.length === 1 ? "ticket" : "tickets"}
                    </span>
                  </div>
                </div>

                {/* PAYMENT METHOD TABS */}
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("TRANSFER")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      paymentMethod === "TRANSFER"
                        ? "bg-slate-800 text-indigo-400 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Pago Transferencia
                  </button>
                  {raffleState?.wompiEnabled !== false && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("WOMPI")}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        paymentMethod === "WOMPI"
                          ? "bg-slate-800 text-emerald-400 shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Wompi Colombia
                    </button>
                  )}
                </div>

                {paymentMethod === "TRANSFER" && (
                  <div className="space-y-4 bg-slate-900/40 p-4 border border-slate-900 rounded-xl animate-fade-in">
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Building size={12} className="text-indigo-400" /> Datos de Cuenta para Transferir:
                      </p>
                      <table className="w-full text-xs text-slate-300 space-y-1">
                        <tbody>
                          <tr>
                            <td className="text-slate-500 py-0.5">Banco:</td>
                            <td className="font-semibold text-slate-200">{raffleState?.bankName || "Bancolombia"}</td>
                          </tr>
                          <tr>
                            <td className="text-slate-500 py-0.5">N° de Cuenta:</td>
                            <td className="font-mono font-semibold text-slate-200 flex items-center justify-end gap-1.5">
                              <span>{raffleState?.accountNumber || "123-456789-01"}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (typeof window !== "undefined") {
                                    navigator.clipboard.writeText(raffleState?.accountNumber || "123-456789-01");
                                    setCopySuccess(true);
                                    setTimeout(() => setCopySuccess(false), 2000);
                                  }
                                }}
                                className="p-1 rounded hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 transition-all flex items-center justify-center cursor-pointer"
                                title="Copiar número de cuenta"
                              >
                                {copySuccess ? (
                                  <CheckCircle2 size={13} className="text-emerald-400" />
                                ) : (
                                  <Copy size={13} />
                                )}
                              </button>
                            </td>
                          </tr>
                          <tr>
                            <td className="text-slate-500 py-0.5">Tipo:</td>
                            <td className="font-semibold text-slate-200">{raffleState?.accountType || "Ahorros"}</td>
                          </tr>
                          <tr>
                            <td className="text-slate-500 py-0.5">Titular:</td>
                            <td className="font-semibold text-slate-200">{raffleState?.accountHolder || "Lottocien SAS"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="pt-2 border-t border-slate-900">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Adjuntar Comprobante de Transferencia:
                      </label>
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-slate-800 rounded-xl cursor-pointer bg-slate-950/20 hover:bg-slate-900/30 transition-all">
                          <div className="flex flex-col items-center justify-center pt-3 pb-3">
                            <Upload className="w-6 h-6 text-slate-500 mb-1" />
                            <p className="text-[10px] text-slate-500">
                              {receiptFile ? (
                                <span className="text-indigo-400 font-semibold flex items-center gap-1">
                                  <FileText size={10} /> {receiptFile.name.slice(0, 25)}
                                </span>
                              ) : (
                                "Subir imagen (PNG, JPG) o PDF"
                              )}
                            </p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*,application/pdf"
                            onChange={handleFileChange}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 text-[10px] text-slate-400 flex gap-2">
                  <Info size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <p>
                    {paymentMethod === "WOMPI"
                      ? "Al pagar con Wompi, tus números se apartarán por 10 minutos para concretar la compra."
                      : "Al enviar la transferencia, tus números quedarán asegurados mientras el administrador confirma el pago."}
                  </p>
                </div>

                {user ? (
                  <button
                    onClick={handlePurchase}
                    disabled={paymentLoading || (paymentMethod === "TRANSFER" && !receiptFile)}
                    className={`w-full py-4 px-4 font-extrabold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed ${
                      paymentMethod === "WOMPI"
                        ? "bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 shadow-emerald-500/10"
                        : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-slate-100 shadow-indigo-500/10"
                    }`}
                  >
                    {paymentLoading ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        {paymentMethod === "WOMPI" ? (
                          <>
                            <CreditCard size={18} />
                            Pagar con Wompi (Pruebas)
                          </>
                        ) : (
                          <>
                            <Upload size={18} />
                            Enviar Comprobante de Pago
                          </>
                        )}
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3 text-center">
                    <Link
                      href="/login"
                      className="block w-full py-3.5 px-4 bg-indigo-500 hover:bg-indigo-400 text-slate-100 font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/25 text-sm"
                    >
                      Inicia Sesión para Comprar
                    </Link>
                    <p className="text-[11px] text-slate-400">
                      Necesitas tener una cuenta para asociar los tickets comprados.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto">
                  <Trophy size={20} className="text-slate-600" />
                </div>
                <p className="text-sm">
                  {raffleState?.winningNumber
                    ? "El sorteo de esta semana ya culminó."
                    : "Haz clic en uno o varios números disponibles de la cuadrícula para iniciar tu proceso de compra."}
                </p>
              </div>
            )}
          </div>

          {/* DUMMY FEED / DRAW INFO */}
          <div className="glass-panel rounded-2xl p-6 shadow-2xl text-xs space-y-4">
            <h4 className="font-bold text-slate-300 uppercase tracking-wider">
              ¿Cómo funcionan los 3 Premios?
            </h4>
            <p className="text-slate-400 leading-relaxed">
              Basado en los resultados semanales de la <span className="text-emerald-400 font-semibold">{raffleState?.lotteryName || "Lotería de Medellín"}</span> de 4 cifras (ej. número ganador <span className="text-slate-300 font-semibold">4789</span>):
            </p>
            <ul className="space-y-3 pl-1 text-slate-400">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span>
                  <strong className="text-slate-200">Premio Mayor ({raffleState?.prizeMayor ? `$${formatCOP(raffleState.prizeMayor)}` : "70%"}):</strong> Acierta las últimas 2 cifras (<span className="text-amber-400 font-semibold">89</span>).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <span>
                  <strong className="text-slate-200">Premio Secundario ({raffleState?.prizeSecundario ? `$${formatCOP(raffleState.prizeSecundario)}` : "20%"}):</strong> Acierta las primeras 2 cifras (<span className="text-indigo-400 font-semibold">47</span>).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                <span>
                  <strong className="text-slate-200">Premio de Consolación ({raffleState?.prizeConsolacion ? `$${formatCOP(raffleState.prizeConsolacion)}` : "10%"}):</strong> Acierta las 2 cifras centrales (<span className="text-violet-400 font-semibold">78</span>).
                </span>
              </li>
            </ul>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="glass-panel border-t border-slate-900 mt-12 py-6 text-center text-xs text-slate-500 space-y-2">
        <p>© 2026 Lottocien. Todos los derechos reservados. Sistema desarrollado bajo Sandbox de Wompi.</p>
        <p>
          <button 
            onClick={() => setShowTermsModal(true)} 
            className="text-indigo-400 hover:text-indigo-300 font-semibold underline"
          >
            Términos y Condiciones de Uso y Participación
          </button>
        </p>
      </footer>

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
              {raffleState?.termsAndConditions || "Cargando términos y condiciones..."}
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-900/20">
              <button
                onClick={() => setShowTermsModal(false)}
                className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition-all active:scale-95"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

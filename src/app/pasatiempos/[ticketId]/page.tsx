"use client";

import React, { useState, useEffect, use, Suspense, lazy, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Gamepad2, ArrowLeft, Trophy, ShieldAlert, Sparkles, Shuffle 
} from "lucide-react";

// Lazy load the game components
const WordSearch = lazy(() => import("./components/WordSearch"));
const Sudoku4x4 = lazy(() => import("./components/Sudoku4x4"));
const TileSwapPuzzle = lazy(() => import("./components/TileSwapPuzzle"));
const Crossword = lazy(() => import("./components/Crossword"));
const Trivia = lazy(() => import("./components/Trivia"));
const FindDifferences = lazy(() => import("./components/FindDifferences"));
const MemoryMatch = lazy(() => import("./components/MemoryMatch"));

interface TicketData {
  number: string;
  status: string;
  pasatiempoConsumido: boolean;
}

const GAMES_LIST = [
  { id: 1, name: "Sopa de letras", desc: "Encuentra palabras de la suerte", icon: "🔍", component: WordSearch },
  { id: 2, name: "Sudoku 4x4", desc: "Completa la grilla con lógica", icon: "🔢", component: Sudoku4x4 },
  { id: 3, name: "Rompecabezas", desc: "Ordena las piezas intercambiándolas", icon: "🧩", component: TileSwapPuzzle },
  { id: 4, name: "Crucigrama", desc: "Resuelve las palabras cruzadas", icon: "✍️", component: Crossword },
  { id: 5, name: "Trivia Temática", desc: "Responde 3 preguntas de azar", icon: "🧠", component: Trivia },
  { id: 6, name: "Encuentra Diferencias", desc: "Descubre los 3 emojis modificados", icon: "👀", component: FindDifferences },
  { id: 7, name: "Desafío de Memoria", desc: "Encuentra las parejas de emojis", icon: "🃏", component: MemoryMatch }
];

// ============================================================================
// CONFIGURACIÓN DE LÍMITE DE TIEMPO DEL JUEGO
// Puedes ajustar aquí el tiempo límite del juego y el aviso previo (en segundos)
// ============================================================================
const MAX_GAME_TIME_SECONDS = 7 * 60; // 7 minutos (420 segundos)
const WARNING_TIME_SECONDS = 10;      // Mostrar temporizador 10 segundos antes del límite
// ============================================================================

export default function PasatiemposPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const ticketId = resolvedParams.ticketId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [gameActive, setGameActive] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  
  // 7-second timer state
  const [timeLeft, setTimeLeft] = useState(14);
  const [isTimerActive, setIsTimerActive] = useState(true);
  
  // Game session elapsed timer state
  const [gameTimeElapsed, setGameTimeElapsed] = useState(0);

  // 1. Fetch ticket status on mount
  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          setError("No has iniciado sesión. Inicia sesión para continuar.");
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/pasatiempos/${ticketId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (res.status === 401) {
          setError("Sesión expirada o no autorizada. Por favor inicia sesión nuevamente.");
        } else if (res.status === 404) {
          setError("El ticket solicitado no existe.");
        } else if (res.status === 403) {
          setError("Acceso denegado. Este ticket no pertenece a tu cuenta.");
        } else if (res.status === 400) {
          const data = await res.json();
          setError(data.error || "Compra no aprobada.");
        } else if (!res.ok) {
          setError("Hubo un problema al cargar los datos del ticket.");
        } else {
          const data: TicketData = await res.json();
          if (data.pasatiempoConsumido) {
            setGameCompleted(true);
          }
        }
      } catch {
        setError("Error de conexión al cargar el pasatiempo.");
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [ticketId]);

  // 2. Lock the selected game in the backend
  const triggerGameLock = useCallback(async (gameId: number) => {
    setSelectedGameId(gameId);
    setLoading(true);

    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/pasatiempos/${ticketId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "No se pudo asegurar el consumo del pasatiempo.");
        setLoading(false);
        return;
      }

      // Haptic feedback if supported by browser
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      // Activate game screen
      setGameActive(true);
    } catch {
      setError("Error de red al asegurar tu selección.");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  // 3. Auto-select a game (Laziness Logic)
  const handleAutoSelect = useCallback(() => {
    setIsTimerActive(false);
    // Select one at random
    const randomGame = GAMES_LIST[Math.floor(Math.random() * GAMES_LIST.length)];
    triggerGameLock(randomGame.id);
  }, [triggerGameLock]);

  // 4. 7-second timer effect for auto-select logic
  useEffect(() => {
    if (!isTimerActive || loading || error || gameActive || gameCompleted || timeLeft <= 0) return;

    const timer = setTimeout(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsTimerActive(false);
          handleAutoSelect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, isTimerActive, loading, error, gameActive, gameCompleted, handleAutoSelect]);

  const handleGameComplete = useCallback(() => {
    setGameActive(false);
    setGameCompleted(true);
  }, []);

  // 5. Active game session duration limit timer (7 minutes by default)
  useEffect(() => {
    if (!gameActive || gameCompleted) {
      setTimeout(() => {
        setGameTimeElapsed(0);
      }, 0);
      return;
    }

    const timer = setInterval(() => {
      setGameTimeElapsed((prev) => {
        const nextTime = prev + 1;
        if (nextTime >= MAX_GAME_TIME_SECONDS) {
          clearInterval(timer);
          handleGameComplete();
          return MAX_GAME_TIME_SECONDS;
        }
        return nextTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameActive, gameCompleted, handleGameComplete]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-indigo-400 border-r-2 border-r-indigo-500/20 animate-spin" />
          <p className="text-slate-400 text-xs tracking-widest uppercase">Cargando Pasatiempos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="glass-panel p-8 rounded-2xl border border-slate-800 shadow-2xl max-w-sm w-full space-y-6">
          <div className="w-16 h-16 bg-red-950/20 rounded-full flex items-center justify-center border border-red-500/30 mx-auto text-red-400 animate-pulse">
            <ShieldAlert size={28} />
          </div>
          <div className="space-y-2">
            <h3 className="font-extrabold text-slate-100 text-lg">Acceso Denegado</h3>
            <p className="text-slate-400 text-xs leading-relaxed">{error}</p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft size={14} /> Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  // Final Success Page
  if (gameCompleted) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl max-w-sm w-full text-center space-y-6 relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-28 h-28 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -right-12 w-28 h-28 bg-emerald-500/10 rounded-full blur-3xl" />

          {/* Success Banner */}
          <div className="relative">
            <div className="w-20 h-20 bg-emerald-950/20 rounded-full flex items-center justify-center border border-emerald-500/30 mx-auto text-emerald-400">
              <Trophy size={36} className="animate-pulse" />
            </div>
            <div className="absolute -top-1 right-8 text-amber-400 animate-bounce">
              <Sparkles size={16} />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-slate-100 font-black text-xl tracking-tight">¡Reto Completado!</h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              Has canjeado con éxito tu bien digital interactivo. Tu número asignado para el sorteo Triplika de esta semana es:
            </p>
          </div>

          {/* Golden Ticket Number Box */}
          <div className="bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15 border border-yellow-500/30 py-4 px-6 rounded-2xl shadow-lg relative">
            <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest block mb-1">
              Ticket Confirmado
            </span>
            <span className="text-4xl font-black text-yellow-300 drop-shadow-[0_2px_10px_rgba(234,179,8,0.3)]">
              {ticketId}
            </span>
          </div>

          <button
            onClick={() => router.push("/")}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-bold rounded-xl text-xs transition-all active:scale-95 shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2"
          >
            Volver a la Tienda
          </button>
        </div>
      </div>
    );
  }

  // Active Game screen
  if (gameActive && selectedGameId) {
    const selectedGame = GAMES_LIST.find(g => g.id === selectedGameId)!;
    const GameComponent = selectedGame.component;
    const secondsLeft = MAX_GAME_TIME_SECONDS - gameTimeElapsed;
    const showCountdown = gameTimeElapsed >= (MAX_GAME_TIME_SECONDS - WARNING_TIME_SECONDS) && secondsLeft > 0;

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col p-4 sm:p-6 md:p-8 relative">
        {/* Active game warning countdown */}
        {showCountdown && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-xs px-4 animate-bounce">
            <div className="bg-red-950/90 border border-red-500/40 text-red-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="animate-ping w-2 h-2 bg-red-500 rounded-full inline-block mr-1" />
                <span className="text-[10px] font-extrabold tracking-wide uppercase">¡Tiempo agotándose!</span>
              </div>
              <span className="text-xs font-black text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-500/20">
                {secondsLeft}s
              </span>
            </div>
          </div>
        )}
        <div className="max-w-md w-full mx-auto flex flex-col space-y-6 flex-grow justify-center">
          {/* Header */}
          <div className="flex justify-between items-center bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedGame.icon}</span>
              <div>
                <h3 className="font-extrabold text-slate-100 text-sm">{selectedGame.name}</h3>
                <span className="text-[10px] text-slate-500 block">Ticket #{ticketId}</span>
              </div>
            </div>
            <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold py-1 px-2.5 rounded-full">
              En juego
            </span>
          </div>

          {/* Game Canvas Container */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col items-center justify-center flex-grow min-h-[350px]">
            <Suspense fallback={
              <div className="flex flex-col items-center space-y-3">
                <div className="w-8 h-8 rounded-full border-t-2 border-indigo-400 animate-spin" />
                <p className="text-slate-500 text-[10px] tracking-wider uppercase">Cargando minijuego...</p>
              </div>
            }>
              <GameComponent onComplete={handleGameComplete} ticketNumber={ticketId} />
            </Suspense>
          </div>

          {/* Back / Exit / Skip button */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleGameComplete}
              className="w-full py-3 bg-slate-900 hover:bg-slate-850 hover:text-indigo-400 border border-slate-800/80 text-slate-400 font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 shadow-inner"
            >
              Terminar / Saltar Juego y ver Ticket
            </button>
            <span className="text-[10px] text-slate-500 text-center">
              * El juego ya ha sido registrado como consumido. No recargues la página.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Game Selection Menu
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center p-4 sm:p-6 md:p-8">
      <div className="max-w-md w-full mx-auto space-y-6">
        
        {/* Banner with 7-second countdown */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 shadow-xl space-y-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-1000" style={{ width: `${(timeLeft / 7) * 100}%` }} />
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Gamepad2 size={18} className="text-indigo-400 animate-pulse" />
              <h2 className="font-extrabold text-slate-100 text-sm">Escoge tu Pasatiempo</h2>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Auto-selección en</span>
              <span className="text-sm font-black text-indigo-400">{timeLeft}s</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Como regalo digital de LottoCien, escoge **uno (1)** de los siguientes 7 pasatiempos interactivos. Una vez comiences el minijuego, tu boleto quedará bloqueado.
          </p>
        </div>

        {/* Games Grid List */}
        <div className="grid grid-cols-1 gap-3 max-h-[360px] overflow-y-auto pr-1">
          {GAMES_LIST.map((game) => (
            <button
              key={game.id}
              onClick={() => triggerGameLock(game.id)}
              className="w-full p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl flex items-center justify-between text-left transition-all active:scale-[0.99] group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl p-2 bg-slate-950 rounded-xl group-hover:scale-110 transition-all">{game.icon}</span>
                <div>
                  <h4 className="font-extrabold text-slate-200 text-xs group-hover:text-indigo-300 transition-all">
                    {game.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                    {game.desc}
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 py-1 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                Jugar
              </span>
            </button>
          ))}
        </div>

        {/* Tengo Pereza Button */}
        <button
          onClick={handleAutoSelect}
          className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold rounded-xl text-xs transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer group"
        >
          <Shuffle size={14} className="text-indigo-400 group-hover:rotate-180 transition-all duration-500" />
          Escoger por mí / Tengo pereza
        </button>

        {/* Back Link */}
        <div className="text-center pt-2">
          <button
            onClick={() => router.push("/")}
            className="text-[11px] text-slate-500 hover:text-slate-300 transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={10} /> Volver a la Tienda (sin jugar aún)
          </button>
        </div>
      </div>
    </div>
  );
}

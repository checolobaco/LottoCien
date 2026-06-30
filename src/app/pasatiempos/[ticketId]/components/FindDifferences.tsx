"use client";

import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";

interface FindDifferencesProps {
  onComplete: () => void;
}

export default function FindDifferences({ onComplete }: FindDifferencesProps) {
  const [gridA, setGridA] = useState<string[][]>([]);
  const [gridB, setGridB] = useState<string[][]>([]);
  const [diffCoordinates, setDiffCoordinates] = useState<{ r: number; c: number }[]>([]);
  const [foundDiffs, setFoundDiffs] = useState<{ r: number; c: number }[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const generatePuzzles = async () => {
      let pool = [
        "🍀", "💎", "💰", "🎟️", "🏆", "🌟", "🎁", "🔥", 
        "🍕", "🚀", "🛸", "🎈", "🎭", "🎲", "🎸", "🎳",
        "🍔", "🍦", "🍎", "🍓", "🥕", "🥑", "🐼", "🦁",
        "🐸", "🐙", "🦋", "🌻", "🌈", "⚡", "🔮", "🧿",
        "🔑", "❤️", "🔔", "📣", "🎨", "👾", "🤖", "👻"
      ];

      try {
        const res = await fetch("/emojis.json");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length >= 10) {
            pool = data;
          }
        }
      } catch {
        // Fallback
      }

      const size = 4;
      // 1. Fill Grid A with random emojis
      const tempGridA: string[][] = Array(size).fill(null).map(() => 
        Array(size).fill(null).map(() => pool[Math.floor(Math.random() * pool.length)])
      );

      // 2. Clone Grid A into Grid B
      const tempGridB = tempGridA.map(row => [...row]);

      // 3. Choose 3 distinct random coordinates for differences
      const diffCoords: { r: number; c: number }[] = [];
      while (diffCoords.length < 3) {
        const r = Math.floor(Math.random() * size);
        const c = Math.floor(Math.random() * size);
        if (!diffCoords.some(coord => coord.r === r && coord.c === c)) {
          diffCoords.push({ r, c });
        }
      }

      // 4. Modify those 3 spots in Grid B with different emojis
      diffCoords.forEach(({ r, c }) => {
        const original = tempGridA[r][c];
        let replacement = original;
        while (replacement === original) {
          replacement = pool[Math.floor(Math.random() * pool.length)];
        }
        tempGridB[r][c] = replacement;
      });

      setTimeout(() => {
        setGridA(tempGridA);
        setGridB(tempGridB);
        setDiffCoordinates(diffCoords);
      }, 0);
    };

    generatePuzzles();
  }, []);

  const handleCellClick = (r: number, c: number) => {
    if (isSuccess) return;

    // Check if clicked cell is one of the differences
    const isDiff = diffCoordinates.some(coord => coord.r === r && coord.c === c);
    const isAlreadyFound = foundDiffs.some(coord => coord.r === r && coord.c === c);

    if (isDiff && !isAlreadyFound) {
      const updatedDiffs = [...foundDiffs, { r, c }];
      setFoundDiffs(updatedDiffs);

      // Check if all 3 differences are found
      if (updatedDiffs.length === 3) {
        setIsSuccess(true);
        setTimeout(() => {
          onComplete();
        }, 1200);
      }
    }
  };

  const isDiffFound = (r: number, c: number) => {
    return foundDiffs.some(coord => coord.r === r && coord.c === c);
  };

  return (
    <div className="flex flex-col items-center space-y-6 w-full max-w-md mx-auto">
      <div className="w-full flex justify-between items-center px-4">
        <span className="text-slate-400 text-xs font-bold">
          Diferencias encontradas: {foundDiffs.length} de 3
        </span>
        <div className="flex gap-1.5">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className={`h-4 w-4 rounded-full flex items-center justify-center border transition-all duration-300 ${
                idx < foundDiffs.length
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  : "bg-slate-800 border-slate-700 text-transparent"
              }`}
            >
              <Check size={10} />
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center leading-relaxed">
        Compara la grilla original (izquierda/arriba) con la modificada (derecha/abajo) y haz clic en las 3 diferencias.
      </p>

      {/* Grids Stack / Split */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
        {/* Grid A: Original */}
        <div className="flex flex-col items-center space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Original</span>
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 shadow-xl w-full aspect-square flex flex-col justify-between select-none">
            {gridA.map((row, rIdx) => (
              <div key={rIdx} className="flex justify-between h-[23%]">
                {row.map((emoji, cIdx) => (
                  <div
                    key={cIdx}
                    className="w-[23%] h-full rounded-xl border border-slate-900 bg-slate-900/40 text-xl flex items-center justify-center pointer-events-none"
                  >
                    {emoji}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Grid B: Modified (Interactive) */}
        <div className="flex flex-col items-center space-y-2">
          <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Buscar Aquí</span>
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 shadow-xl w-full aspect-square flex flex-col justify-between select-none">
            {gridB.map((row, rIdx) => (
              <div key={rIdx} className="flex justify-between h-[23%]">
                {row.map((emoji, cIdx) => {
                  const isFound = isDiffFound(rIdx, cIdx);
                  
                  let cellClass = "bg-slate-900 border-slate-800 hover:bg-slate-800 cursor-pointer";
                  if (isFound) {
                    cellClass = "bg-emerald-600/30 border-emerald-500/50 scale-95 ring-2 ring-emerald-500/20";
                  }

                  return (
                    <button
                      key={cIdx}
                      onClick={() => handleCellClick(rIdx, cIdx)}
                      disabled={isSuccess || isFound}
                      className={`w-[23%] h-full rounded-xl border text-xl flex items-center justify-center transition-all duration-200 active:scale-95 ${cellClass}`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

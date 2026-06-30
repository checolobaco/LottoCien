"use client";

import React, { useState, useEffect, useRef } from "react";

interface CrosswordProps {
  onComplete: () => void;
}

interface CrosswordTemplate {
  h1: string; // row 0
  h3: string; // row 2
  v1: string; // col 0
  v2: string; // col 3
  clues: {
    horizontal: string[];
    vertical: string[];
  };
}

export default function Crossword({ onComplete }: CrosswordProps) {
  const [template, setTemplate] = useState<CrosswordTemplate | null>(null);
  const [inputs, setInputs] = useState<string[][]>(
    Array(4).fill(null).map(() => Array(4).fill(""))
  );
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRefs = useRef<HTMLInputElement[][]>([]);

  useEffect(() => {
    const loadCrossword = async () => {
      let pool = [
        {
          h1: "RIFA",
          h3: "VALE",
          v1: "RIVA",
          v2: "ALCE",
          clues: {
            horizontal: ["1. Sorteo o juego de azar con venta de boletos.", "2. Comprobante o cupón que se canjea."],
            vertical: ["1. Orilla o margen de un río (arcaico/poético).", "2. Mamífero rumiante de grandes astas planas."]
          }
        }
      ];

      try {
        const res = await fetch("/crossword.json");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            pool = data;
          }
        }
      } catch {
        // Fallback
      }

      const picked = pool[Math.floor(Math.random() * pool.length)];
      setTimeout(() => {
        setTemplate(picked);
      }, 0);
    };

    loadCrossword();
  }, []);

  if (!template) return null;

  // Active coordinates in the crossword layout
  const isActiveCell = (r: number, c: number) => {
    if (r === 0 || r === 2) return true;
    if (c === 0 || c === 3) return true;
    return false;
  };

  // Get index/number to show in cell corner (1-4)
  const getCellLabel = (r: number, c: number) => {
    if (r === 0 && c === 0) return "1";
    if (r === 0 && c === 3) return "2";
    if (r === 2 && c === 0) return "3";
    return "";
  };

  const getCorrectLetter = (r: number, c: number): string => {
    if (!template) return "";
    if (r === 0) return template.h1[c] || "";
    if (r === 2) return template.h3[c] || "";
    if (c === 0) return template.v1[r] || "";
    if (c === 3) return template.v2[r] || "";
    return "";
  };

  const isCellCorrect = (r: number, c: number) => {
    const val = inputs[r][c];
    return val !== "" && val.toUpperCase() === getCorrectLetter(r, c).toUpperCase();
  };

  const handleInputChange = (r: number, c: number, value: string) => {
    if (isSuccess) return;

    const letter = value.toUpperCase().slice(-1); // Keep only the last character in uppercase

    const newInputs = inputs.map((row, rowIdx) =>
      row.map((val, colIdx) => (rowIdx === r && colIdx === c ? letter : val))
    );

    setInputs(newInputs);

    // Auto-focus next cell
    if (letter !== "") {
      focusNextCell(r, c);
    }

    validateCrossword(newInputs);
  };

  const focusNextCell = (r: number, c: number) => {
    // Focus sequence: H1, then H3, then fill V1/V2 middle cells
    if (r === 0 && c < 3) {
      inputRefs.current[0]?.[c + 1]?.focus();
    } else if (r === 0 && c === 3) {
      inputRefs.current[1]?.[0]?.focus();
    } else if (r === 1 && c === 0) {
      inputRefs.current[2]?.[0]?.focus();
    } else if (r === 2 && c < 3) {
      inputRefs.current[2]?.[c + 1]?.focus();
    } else if (r === 2 && c === 3) {
      inputRefs.current[3]?.[0]?.focus();
    } else if (r === 3 && c === 0) {
      inputRefs.current[1]?.[3]?.focus();
    } else if (r === 1 && c === 3) {
      inputRefs.current[3]?.[3]?.focus();
    }
  };

  const validateCrossword = (currentInputs: string[][]) => {
    // H1 (Row 0)
    const h1Str = currentInputs[0].join("");
    // H3 (Row 2)
    const h3Str = currentInputs[2].join("");
    // V1 (Col 0)
    const v1Str = currentInputs.map(row => row[0]).join("");
    // V2 (Col 3)
    const v2Str = currentInputs.map(row => row[3]).join("");

    if (
      h1Str === template.h1 &&
      h3Str === template.h3 &&
      v1Str === template.v1 &&
      v2Str === template.v2
    ) {
      setIsSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 1200);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 w-full max-w-md mx-auto">
      <p className="text-xs text-slate-400 text-center leading-relaxed">
        Escribe las letras correctas en la cuadrícula para resolver las pistas horizontales y verticales.
      </p>

      {/* Grid */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-2xl w-full aspect-square flex flex-col justify-between select-none">
        {Array.from({ length: 4 }).map((_, rIdx) => (
          <div key={rIdx} className="flex justify-between h-[23%]">
            {Array.from({ length: 4 }).map((_, cIdx) => {
              const active = isActiveCell(rIdx, cIdx);
              const label = getCellLabel(rIdx, cIdx);

              if (!active) {
                return (
                  <div 
                    key={cIdx} 
                    className="w-[23%] h-full bg-slate-900/10 border border-slate-950/20 rounded-xl"
                  />
                );
              }

              return (
                <div key={cIdx} className="relative w-[23%] h-full">
                  {label && (
                    <span className="absolute top-1 left-1.5 text-[9px] font-black text-slate-500">
                      {label}
                    </span>
                  )}
                  <input
                    ref={el => {
                      if (!inputRefs.current[rIdx]) inputRefs.current[rIdx] = [];
                      if (el) inputRefs.current[rIdx][cIdx] = el;
                    }}
                    type="text"
                    value={inputs[rIdx][cIdx]}
                    onChange={e => handleInputChange(rIdx, cIdx, e.target.value)}
                    disabled={isSuccess}
                    className={`w-full h-full rounded-xl border text-center text-xl font-black transition-all duration-200 outline-none ${
                      isCellCorrect(rIdx, cIdx) || isSuccess
                        ? "bg-emerald-600/30 border-emerald-500/50 text-emerald-200"
                        : "bg-slate-900 border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-slate-100"
                    }`}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Clues */}
      <div className="w-full grid grid-cols-2 gap-4 p-4 bg-slate-900/60 rounded-2xl border border-slate-800 backdrop-blur-sm text-left">
        <div>
          <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-400 mb-2">Horizontales</h4>
          <ul className="space-y-2">
            {template.clues.horizontal.map((clue, idx) => (
              <li key={idx} className="text-slate-300 text-[10px] leading-relaxed">
                {clue}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400 mb-2">Verticales</h4>
          <ul className="space-y-2">
            {template.clues.vertical.map((clue, idx) => (
              <li key={idx} className="text-slate-300 text-[10px] leading-relaxed">
                {clue}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

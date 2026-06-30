"use client";

import React, { useState, useEffect } from "react";

interface Sudoku4x4Props {
  onComplete: () => void;
}

// Solved base grid template
const BASE_GRID = [
  [1, 2, 3, 4],
  [3, 4, 1, 2],
  [2, 1, 4, 3],
  [4, 3, 2, 1]
];

const rotateMatrix90 = (matrix: number[][]) => {
  const size = matrix.length;
  const rotated = Array(size).fill(null).map(() => Array(size).fill(0));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      rotated[c][size - 1 - r] = matrix[r][c];
    }
  }
  return rotated;
};

export default function Sudoku4x4({ onComplete }: Sudoku4x4Props) {
  const [initialGrid, setInitialGrid] = useState<number[][]>([]);
  const [userGrid, setUserGrid] = useState<number[][]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // 1. Generate random mapping of numbers (1-4 -> permuted 1-4)
    const numbers = [1, 2, 3, 4];
    const permuted = [...numbers].sort(() => 0.5 - Math.random());
    const mapping: Record<number, number> = {};
    numbers.forEach((num, idx) => {
      mapping[num] = permuted[idx];
    });

    // 2. Map the base template
    let transformed: number[][] = BASE_GRID.map(row => row.map(val => mapping[val]));

    // 3. Random rotations (0, 90, 180, 270)
    const rotations = Math.floor(Math.random() * 4);
    for (let r = 0; r < rotations; r++) {
      transformed = rotateMatrix90(transformed);
    }

    // 4. Random mirroring
    if (Math.random() > 0.5) {
      transformed = transformed.map(row => [...row].reverse());
    }

    // 5. Hide random cells (remove 6-8 cells)
    const emptyCount = 7;
    const initial = transformed.map(row => [...row]);
    let hidden = 0;
    while (hidden < emptyCount) {
      const r = Math.floor(Math.random() * 4);
      const c = Math.floor(Math.random() * 4);
      if (initial[r][c] !== 0) {
        initial[r][c] = 0;
        hidden++;
      }
    }

    setTimeout(() => {
      setInitialGrid(initial);
      setUserGrid(initial.map(row => [...row]));
    }, 0);
  }, []);

  const handleCellClick = (r: number, c: number) => {
    if (initialGrid[r]?.[c] !== 0 || isSuccess) return; // Can't change initial cells

    const currentVal = userGrid[r][c];
    const nextVal = currentVal === 4 ? 0 : currentVal + 1; // Cycle: 0 -> 1 -> 2 -> 3 -> 4 -> 0

    const updatedGrid = userGrid.map((row, rowIdx) =>
      row.map((val, colIdx) => (rowIdx === r && colIdx === c ? nextVal : val))
    );

    setUserGrid(updatedGrid);
    validateGrid(updatedGrid);
  };

  const validateGrid = (gridToValidate: number[][]) => {
    // Check if fully filled
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (gridToValidate[r][c] === 0) return;
      }
    }

    // Check rows and columns
    for (let i = 0; i < 4; i++) {
      const rowSet = new Set(gridToValidate[i]);
      const colSet = new Set(gridToValidate.map(row => row[i]));
      if (rowSet.size !== 4 || colSet.size !== 4) return;
    }

    // Check 2x2 subgrids
    const subgrids = [
      [0, 0], [0, 2], [2, 0], [2, 2]
    ];

    for (const [sr, sc] of subgrids) {
      const blockSet = new Set<number>();
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
          blockSet.add(gridToValidate[sr + r][sc + c]);
        }
      }
      if (blockSet.size !== 4) return;
    }

    // If we passed all checks, it's correct!
    setIsSuccess(true);
    setTimeout(() => {
      onComplete();
    }, 1200);
  };

  return (
    <div className="flex flex-col items-center space-y-6 w-full max-w-sm mx-auto">
      <p className="text-xs text-slate-400 text-center leading-relaxed max-w-xs">
        Rellena las celdas vacías del 1 al 4 de modo que no se repita ningún número en filas, columnas ni bloques 2x2.
      </p>

      {/* Sudoku Grid */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-2xl w-full aspect-square flex flex-col justify-between select-none">
        {userGrid.map((row, rIdx) => (
          <div 
            key={rIdx} 
            className={`flex justify-between h-[23%] ${
              rIdx === 1 ? "border-b-2 border-slate-700 pb-2" : ""
            } ${rIdx === 2 ? "pt-2" : ""}`}
          >
            {row.map((val, cIdx) => {
              const isInitial = initialGrid[rIdx]?.[cIdx] !== 0;
              const cellVal = val === 0 ? "" : val;
              
              let cellClass = "";
              if (isInitial) {
                cellClass = "bg-slate-900 border-slate-800/80 text-slate-400 font-bold cursor-not-allowed";
              } else {
                cellClass = isSuccess 
                  ? "bg-emerald-600/30 border-emerald-500/30 text-emerald-200 font-black"
                  : val !== 0
                    ? "bg-indigo-900/40 border-indigo-500/40 text-indigo-300 font-black hover:bg-indigo-950/60"
                    : "bg-slate-950 border-slate-800/40 text-transparent hover:bg-slate-900 cursor-pointer";
              }

              return (
                <button
                  key={cIdx}
                  onClick={() => handleCellClick(rIdx, cIdx)}
                  disabled={isInitial || isSuccess}
                  className={`w-[23%] h-full rounded-xl border text-center text-xl transition-all duration-200 active:scale-95 flex items-center justify-center ${
                    cIdx === 1 ? "mr-2 border-r-2 border-slate-700/60" : ""
                  } ${cIdx === 2 ? "ml-2" : ""} ${cellClass}`}
                >
                  {cellVal}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

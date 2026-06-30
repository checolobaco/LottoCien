"use client";

import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";

interface WordSearchProps {
  onComplete: () => void;
  ticketNumber: string;
}

export default function WordSearch({ onComplete, ticketNumber }: WordSearchProps) {
  const [grid, setGrid] = useState<string[][]>([]);
  const [targetWords, setTargetWords] = useState<string[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [selectedCells, setSelectedCells] = useState<{ r: number; c: number }[]>([]);
  const [placedPositions, setPlacedPositions] = useState<{ r: number; c: number; word: string }[]>([]);

  useEffect(() => {
    const generateGrid = async () => {
      let pool = ["SUERTE", "PREMIO", "TRIPLIKA", "AZAR", "GANAR"];
      try {
        const res = await fetch("/palabras.json");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length >= 3) {
            pool = data;
          }
        }
      } catch {
        // Use default fallback pool
      }

      // Pick 3 random unique words (length between 3 and 8)
      const selectedSet = new Set<string>();
      let attemptsToSelect = 0;
      while (selectedSet.size < 3 && attemptsToSelect < 200) {
        attemptsToSelect++;
        const randomWord = pool[Math.floor(Math.random() * pool.length)].toUpperCase().replace(/[^A-Z]/g, "");
        if (randomWord.length >= 3 && randomWord.length <= 8) {
          selectedSet.add(randomWord);
        }
      }

      // If we couldn't get 3 unique words, fill with defaults
      const backups = ["SUERTE", "PREMIO", "LOTTO"];
      let backupIdx = 0;
      while (selectedSet.size < 3) {
        selectedSet.add(backups[backupIdx++]);
      }

      const selected = Array.from(selectedSet);

      // 2. Initialize 8x8 empty grid
      const size = 8;
      const tempGrid: string[][] = Array(size).fill(null).map(() => Array(size).fill(""));
      const placed: { r: number; c: number; word: string }[] = [];

      selected.forEach(word => {
        let isPlaced = false;
        let attempts = 0;

        while (!isPlaced && attempts < 100) {
          attempts++;
          const isHorizontal = Math.random() > 0.5;
          const row = Math.floor(Math.random() * size);
          const col = Math.floor(Math.random() * size);

          if (isHorizontal) {
            if (col + word.length <= size) {
              let canPlace = true;
              for (let i = 0; i < word.length; i++) {
                const currentCell = tempGrid[row][col + i];
                if (currentCell !== "" && currentCell !== word[i]) {
                  canPlace = false;
                  break;
                }
              }
              if (canPlace) {
                for (let i = 0; i < word.length; i++) {
                  tempGrid[row][col + i] = word[i];
                  placed.push({ r: row, c: col + i, word });
                }
                isPlaced = true;
              }
            }
          } else {
            if (row + word.length <= size) {
              let canPlace = true;
              for (let i = 0; i < word.length; i++) {
                const currentCell = tempGrid[row + i][col];
                if (currentCell !== "" && currentCell !== word[i]) {
                  canPlace = false;
                  break;
                }
              }
              if (canPlace) {
                for (let i = 0; i < word.length; i++) {
                  tempGrid[row + i][col] = word[i];
                  placed.push({ r: row + i, c: col, word });
                }
                isPlaced = true;
              }
            }
          }
        }
      });

      // Fill remaining empty cells with random letters
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (tempGrid[r][c] === "") {
            tempGrid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
          }
        }
      }

      setTimeout(() => {
        setTargetWords(selected);
        setGrid(tempGrid);
        setPlacedPositions(placed);
      }, 0);
    };

    generateGrid();
  }, [ticketNumber]);

  const handleCellClick = (r: number, c: number) => {
    const isAlreadySelectedIndex = selectedCells.findIndex(cell => cell.r === r && cell.c === c);
    if (isAlreadySelectedIndex >= 0) {
      // Remove from selection
      setSelectedCells(selectedCells.filter((_, idx) => idx !== isAlreadySelectedIndex));
    } else {
      // Add to selection
      setSelectedCells([...selectedCells, { r, c }]);
    }
  };

  const getSelectionString = () => {
    return selectedCells.map(cell => grid[cell.r]?.[cell.c] || "").join("");
  };

  const checkSelection = () => {
    const currentStr = getSelectionString();
    const reversedStr = currentStr.split("").reverse().join("");

    let wordFound = "";
    if (targetWords.includes(currentStr) && !foundWords.includes(currentStr)) {
      wordFound = currentStr;
    } else if (targetWords.includes(reversedStr) && !foundWords.includes(reversedStr)) {
      wordFound = reversedStr;
    }

    if (wordFound) {
      const updatedFound = [...foundWords, wordFound];
      setFoundWords(updatedFound);
      setSelectedCells([]);

      // Check if game complete
      if (updatedFound.length === targetWords.length) {
        setTimeout(() => {
          onComplete();
        }, 1200);
      }
    } else {
      // Clear selection if it doesn't match
      setSelectedCells([]);
    }
  };

  const isCellSelected = (r: number, c: number) => {
    return selectedCells.some(cell => cell.r === r && cell.c === c);
  };

  const isCellInFoundWord = (r: number, c: number) => {
    return placedPositions.some(pos => {
      return pos.r === r && pos.c === c && foundWords.includes(pos.word);
    });
  };

  return (
    <div className="flex flex-col items-center space-y-6 w-full max-w-md mx-auto">
      {/* Target Words List */}
      <div className="w-full flex justify-around p-3 bg-slate-900/60 rounded-xl border border-slate-800 backdrop-blur-sm">
        {targetWords.map(word => {
          const isFound = foundWords.includes(word);
          return (
            <span
              key={word}
              className={`text-xs font-bold px-2 py-1 rounded-lg transition-all duration-300 flex items-center gap-1 ${
                isFound 
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 line-through" 
                  : "bg-slate-800 text-slate-300 border border-slate-700"
              }`}
            >
              {isFound && <Check size={12} />}
              {word}
            </span>
          );
        })}
      </div>

      {/* Grid Container */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-2xl w-full aspect-square flex flex-col justify-between">
        {grid.map((row, rIdx) => (
          <div key={rIdx} className="flex justify-between h-[11%]">
            {row.map((letter, cIdx) => {
              const isSelected = isCellSelected(rIdx, cIdx);
              const isFound = isCellInFoundWord(rIdx, cIdx);
              
              let cellClass = "bg-slate-900 border-slate-800/40 text-slate-300 hover:bg-slate-800 hover:text-slate-100";
              if (isSelected) {
                cellClass = "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30 scale-95";
              } else if (isFound) {
                cellClass = "bg-emerald-600/40 border-emerald-500/30 text-emerald-200";
              }

              return (
                <button
                  key={cIdx}
                  onClick={() => handleCellClick(rIdx, cIdx)}
                  className={`w-[11%] h-full rounded-lg border text-center font-extrabold text-sm transition-all duration-200 active:scale-90 select-none cursor-pointer flex items-center justify-center ${cellClass}`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex w-full gap-3 justify-center">
        <button
          onClick={checkSelection}
          disabled={selectedCells.length === 0}
          className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-100 font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer shadow-lg shadow-indigo-500/20"
        >
          Verificar ({getSelectionString()})
        </button>
        <button
          onClick={() => setSelectedCells([])}
          disabled={selectedCells.length === 0}
          className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:text-slate-600 text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
        >
          Limpiar
        </button>
      </div>
    </div>
  );
}

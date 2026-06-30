"use client";

import React, { useState, useEffect } from "react";

interface TileSwapPuzzleProps {
  onComplete: () => void;
  ticketNumber: string;
}

interface Tile {
  id: number; // Correct position (0 to 8)
  currentPos: number; // Current grid index (0 to 8)
}

export default function TileSwapPuzzle({ onComplete, ticketNumber }: TileSwapPuzzleProps) {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("/Ilustración de Premio.png");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const loadPuzzle = async () => {
      let pool = [
        "/Ilustración de Premio.png",
        "/Banner_Hero.png",
        "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&q=80&fit=crop"
      ];

      try {
        const res = await fetch("/puzzles.json");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            pool = data.map((item: string | { url: string; name?: string }) => typeof item === "string" ? item : item.url);
          }
        }
      } catch {
        // Fallback
      }

      const pickedImage = pool[Math.floor(Math.random() * pool.length)];

      // Generate tiles (0 to 8)
      const initialTiles = Array.from({ length: 9 }, (_, i) => ({
        id: i,
        currentPos: i
      }));

      // Shuffle positions until they are not in the correct order
      let shuffled: Tile[] = [];
      let isCorrect = true;

      while (isCorrect) {
        const positions = Array.from({ length: 9 }, (_, i) => i).sort(() => Math.random() - 0.5);
        shuffled = initialTiles.map((tile, idx) => ({
          ...tile,
          currentPos: positions[idx]
        }));
        isCorrect = shuffled.every(tile => tile.id === tile.currentPos);
      }

      setTimeout(() => {
        setImageUrl(pickedImage);
        setTiles(shuffled);
      }, 0);
    };

    loadPuzzle();
  }, []);

  const handleTileClick = (gridIdx: number) => {
    if (isSuccess) return;

    if (selectedIdx === null) {
      setSelectedIdx(gridIdx);
    } else {
      if (selectedIdx === gridIdx) {
        setSelectedIdx(null);
        return;
      }

      // Swap the tiles at selectedIdx and gridIdx
      const updatedTiles = tiles.map(tile => {
        if (tile.currentPos === selectedIdx) {
          return { ...tile, currentPos: gridIdx };
        }
        if (tile.currentPos === gridIdx) {
          return { ...tile, currentPos: selectedIdx };
        }
        return tile;
      });

      setTiles(updatedTiles);
      setSelectedIdx(null);

      // Check success
      const solved = updatedTiles.every(tile => tile.id === tile.currentPos);
      if (solved) {
        setIsSuccess(true);
        setTimeout(() => {
          onComplete();
        }, 1200);
      }
    }
  };

  // Helper to find tile by its currentPos in grid
  const getTileAtGridPos = (gridIdx: number) => {
    return tiles.find(t => t.currentPos === gridIdx);
  };

  // Convert linear index (0-8) to percentage for backgroundOffset
  const getBackgroundPosition = (id: number) => {
    const r = Math.floor(id / 3);
    const c = id % 3;
    return `${c * 50}% ${r * 50}%`;
  };

  return (
    <div className="flex flex-col items-center space-y-6 w-full max-w-sm mx-auto">
      <p className="text-xs text-slate-400 text-center max-w-xs leading-relaxed">
        Haz clic en una pieza y luego en otra para intercambiarlas. Reconstruye la imagen de LottoCien.
      </p>

      {/* Guía de resolución del rompecabezas */}
      <div className="flex flex-col items-center space-y-1.5">
        <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Así debe quedar:</span>
        <div 
          className="w-24 h-24 rounded-xl border border-slate-800 shadow-md bg-slate-900"
          style={{
            backgroundImage: `url("${imageUrl}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat"
          }}
        />
      </div>

      {/* Grid Container */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-2xl w-full aspect-square flex flex-col justify-between select-none">
        <div className="grid grid-cols-3 grid-rows-3 gap-2 w-full h-full">
          {Array.from({ length: 9 }).map((_, gridIdx) => {
            const tile = getTileAtGridPos(gridIdx);
            const isSelected = selectedIdx === gridIdx;

            if (!tile) return <div key={gridIdx} className="bg-slate-900 rounded-xl" />;

            const bgPos = getBackgroundPosition(tile.id);
            const isCorrectPos = tile.id === tile.currentPos;

            return (
              <button
                key={gridIdx}
                onClick={() => handleTileClick(gridIdx)}
                className={`relative rounded-xl overflow-hidden border transition-all duration-300 active:scale-95 cursor-pointer ${
                  isSelected
                    ? "border-amber-400 ring-2 ring-amber-400/40 shadow-lg scale-95 z-10"
                    : isSuccess
                      ? "border-emerald-500"
                      : isCorrectPos
                        ? "border-indigo-500/40 opacity-95"
                        : "border-slate-800 hover:border-slate-700"
                }`}
                style={{
                  backgroundImage: `url("${imageUrl}")`,
                  backgroundSize: "300% 300%",
                  backgroundPosition: bgPos,
                  backgroundRepeat: "no-repeat",
                  backgroundColor: "#020617"
                }}
              >
                {/* Visual card content inside the sliced tiles */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-slate-950 select-none pointer-events-none">
                  {tile.id === 4 && (
                    <span className="font-black text-[10px] tracking-wider text-white bg-slate-950/80 px-1 py-0.5 rounded uppercase">
                      LottoCien
                    </span>
                  )}
                  {tile.id === 7 && (
                    <span className="font-extrabold text-base text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      #{ticketNumber}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

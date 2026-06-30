"use client";

import React, { useState, useEffect } from "react";
import { HelpCircle } from "lucide-react";

interface MemoryMatchProps {
  onComplete: () => void;
}

export default function MemoryMatch({ onComplete }: MemoryMatchProps) {
  const [cards, setCards] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const loadMemoryMatch = async () => {
      let pool = [
        "🍀", "💎", "💰", "🎟️", "🏆", "🌟", "🎁", "🔥", 
        "🚀", "🛸", "🎈", "🎭", "🎲", "🎸", "🍔", "🍦", 
        "🍎", "🍓", "🦁", "🐸", "🐙", "🌻", "🌈", "⚡", 
        "🔮", "🔑", "❤️", "🔔", "👾", "🤖", "👻", "🥑"
      ];

      try {
        const res = await fetch("/emojis.json");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length >= 6) {
            pool = data;
          }
        }
      } catch {
        // Fallback
      }

      // 1. Pick 6 random emojis
      const shuffledEmojis = [...pool].sort(() => 0.5 - Math.random());
      const selected = shuffledEmojis.slice(0, 6);

      // 2. Duplicate to make pairs (12 cards) and shuffle
      const paired = [...selected, ...selected].sort(() => 0.5 - Math.random());
      setTimeout(() => {
        setCards(paired);
      }, 0);
    };

    loadMemoryMatch();
  }, []);

  const handleCardClick = (idx: number) => {
    if (isSuccess || matched.includes(idx) || flipped.includes(idx)) return;

    if (flipped.length === 0) {
      setFlipped([idx]);
    } else if (flipped.length === 1) {
      const firstIdx = flipped[0];
      setFlipped([firstIdx, idx]);

      // Check for match
      if (cards[firstIdx] === cards[idx]) {
        const newMatched = [...matched, firstIdx, idx];
        setMatched(newMatched);
        setFlipped([]);

        // Check if all cards matched
        if (newMatched.length === 12) {
          setIsSuccess(true);
          setTimeout(() => {
            onComplete();
          }, 1200);
        }
      } else {
        // No match, flip back after a second
        setTimeout(() => {
          setFlipped([]);
        }, 1000);
      }
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 w-full max-w-sm mx-auto">
      <div className="w-full flex justify-between items-center px-4">
        <span className="text-slate-400 text-xs font-bold">
          Parejas encontradas: {matched.length / 2} de 6
        </span>
      </div>

      <p className="text-xs text-slate-400 text-center leading-relaxed">
        Haz clic en las cartas para voltearlas e ir encontrando las parejas de emojis iguales.
      </p>

      {/* Grid Container */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-2xl w-full select-none">
        <div className="grid grid-cols-4 gap-3 w-full aspect-[4/3]">
          {cards.map((emoji, idx) => {
            const isFlipped = flipped.includes(idx);
            const isMatched = matched.includes(idx);
            const showFace = isFlipped || isMatched;

            return (
              <button
                key={idx}
                onClick={() => handleCardClick(idx)}
                disabled={isSuccess || isMatched || isFlipped}
                className={`aspect-square rounded-xl border flex items-center justify-center transition-all duration-300 transform cursor-pointer ${
                  showFace
                    ? isMatched
                      ? "bg-emerald-600/30 border-emerald-500/40 text-2xl scale-95 opacity-80"
                      : "bg-indigo-900/40 border-indigo-500/40 text-2xl rotate-y-180"
                    : "bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-500 hover:text-slate-400"
                }`}
              >
                {showFace ? (
                  <span className="animate-fade-in">{emoji}</span>
                ) : (
                  <HelpCircle size={20} className="stroke-[1.5]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

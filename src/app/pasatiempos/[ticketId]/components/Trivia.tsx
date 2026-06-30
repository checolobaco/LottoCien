"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

interface TriviaProps {
  onComplete: () => void;
}

interface Question {
  q: string;
  options: string[];
  correct: string;
}

export default function Trivia({ onComplete }: TriviaProps) {
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const loadTrivia = async () => {
      let pool = [
        {
          q: "¿Cuál es la probabilidad de acertar un número de dos cifras (00 al 99)?",
          options: ["1 entre 100", "1 entre 50", "1 entre 1000", "1 entre 10"],
          correct: "1 entre 100"
        }
      ];
      try {
        const res = await fetch("/trivia.json");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length >= 3) {
            pool = data;
          }
        }
      } catch {
        // Fallback
      }

      // Pick 3 random questions
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 3).map(question => {
        // Shuffle options for each question
        const shuffledOptions = [...question.options].sort(() => 0.5 - Math.random());
        return {
          ...question,
          options: shuffledOptions
        };
      });

      setTimeout(() => {
        setSelectedQuestions(selected);
      }, 0);
    };

    loadTrivia();
  }, []);

  const handleAnswerClick = (option: string) => {
    if (feedback || isSuccess) return;

    const currentQuestion = selectedQuestions[currentIdx];
    const isCorrect = option === currentQuestion.correct;

    if (isCorrect) {
      setFeedback({ isCorrect: true, message: "¡Respuesta Correcta!" });
      setTimeout(() => {
        setFeedback(null);
        if (currentIdx < 2) {
          setCurrentIdx(currentIdx + 1);
        } else {
          setIsSuccess(true);
          onComplete();
        }
      }, 1500);
    } else {
      setFeedback({ isCorrect: false, message: "Incorrecto. Inténtalo de nuevo." });
      setTimeout(() => {
        setFeedback(null);
      }, 1500);
    }
  };

  if (selectedQuestions.length === 0) return null;

  const currentQuestion = selectedQuestions[currentIdx];

  return (
    <div className="flex flex-col items-center space-y-6 w-full max-w-md mx-auto">
      {/* Progress indicators */}
      <div className="w-full flex justify-between items-center px-4">
        <span className="text-slate-400 text-xs font-bold">
          Pregunta {currentIdx + 1} de 3
        </span>
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className={`h-2 w-10 rounded-full transition-all duration-300 ${
                idx === currentIdx
                  ? "bg-indigo-500 scale-105"
                  : idx < currentIdx
                    ? "bg-emerald-500"
                    : "bg-slate-800"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question Card */}
      <div className="glass-panel w-full p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-4 text-center min-h-[140px] flex flex-col justify-center">
        <h3 className="text-slate-100 font-extrabold text-sm sm:text-base leading-relaxed">
          {currentQuestion.q}
        </h3>
      </div>

      {/* Options */}
      <div className="w-full flex flex-col gap-3">
        {currentQuestion.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => handleAnswerClick(option)}
            disabled={feedback !== null || isSuccess}
            className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800/80 disabled:opacity-55 rounded-xl font-bold text-xs sm:text-sm text-slate-200 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer text-center"
          >
            {option}
          </button>
        ))}
      </div>

      {/* Feedback Alert Overlay */}
      {feedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-2xl max-w-xs w-full text-center flex flex-col items-center gap-3">
            {feedback.isCorrect ? (
              <CheckCircle2 size={44} className="text-emerald-400 animate-bounce" />
            ) : (
              <XCircle size={44} className="text-red-400 animate-pulse" />
            )}
            <h4 className="font-extrabold text-sm text-slate-100">
              {feedback.message}
            </h4>
          </div>
        </div>
      )}
    </div>
  );
}

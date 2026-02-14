import React from 'react';
import { Question } from '../../types';

type PlayingScreenProps = {
  playerName: string;
  currentAnswerBonus: number;
  currentQuestionIndex: number;
  currentQuestion: Question;
  isAnswered: boolean;
  selectedAnswer: string | null;
  onAnswer: (answer: string) => void;
  onNextQuestion: () => void;
  onExit: () => void;
};

export const PlayingScreen: React.FC<PlayingScreenProps> = ({
  playerName,
  currentAnswerBonus,
  currentQuestionIndex,
  currentQuestion,
  isAnswered,
  selectedAnswer,
  onAnswer,
  onNextQuestion,
  onExit,
}) => {
  return (
    <div className="h-[100dvh] w-full flex flex-col items-center bg-indigo-900 safe-pt safe-px overflow-hidden">
      <div className="w-full max-w-2xl flex justify-between items-center mb-4 px-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase">
            {playerName}
          </span>
          <span className="text-[10px] font-black text-rose-400">
            +{currentAnswerBonus} pts
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white font-black text-xs">
            {currentQuestionIndex + 1}/10
          </span>
          <button
            onClick={onExit}
            className="bg-rose-500 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase"
          >
            Irten
          </button>
        </div>
      </div>
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-6 border border-slate-200 flex flex-col h-full max-h-[85dvh] relative mb-6">
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{
              width: `${((currentQuestionIndex + (isAnswered ? 1 : 0)) / 10) * 100}%`,
            }}
          />
        </div>
        <div className="text-center my-8 shrink-0">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">
            Sinonimoa aukeratu
          </p>
          <h3 className="text-4xl md:text-5xl font-black text-slate-900 uppercase leading-tight tracking-tighter">
            {currentQuestion.wordData.hitza}
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-3 grow min-h-0 overflow-y-auto">
          {currentQuestion.options.map((opt, i) => {
            let style =
              'w-full rounded-2xl border-2 font-black text-2xl md:text-3xl transition-all p-4 h-full flex items-center justify-center ';
            if (!isAnswered) {
              style +=
                'bg-white border-slate-100 text-slate-700 hover:border-indigo-500 active:scale-[0.98]';
            } else {
              if (opt === currentQuestion.correctAnswer) {
                style += 'bg-emerald-500 border-emerald-300 text-white shadow-lg';
              } else if (opt === selectedAnswer) {
                style += 'bg-rose-500 border-rose-300 text-white';
              } else {
                style += 'bg-slate-50 border-slate-50 text-slate-300 opacity-40';
              }
            }
            return (
              <button
                key={i}
                disabled={isAnswered}
                onClick={() => onAnswer(opt)}
                className={style}
              >
                {opt}
              </button>
            );
          })}
        </div>
        <div className="mt-8 shrink-0 h-16 flex items-center justify-center">
          {isAnswered && (
            <button
              onClick={onNextQuestion}
              className="w-full bg-indigo-950 text-white font-black h-full rounded-2xl shadow-lg active:scale-95 text-xl uppercase tracking-widest"
            >
              {currentQuestionIndex < 9 ? 'Hurrengoa' : 'Bukatu'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

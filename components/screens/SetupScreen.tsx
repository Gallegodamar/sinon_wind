import React from 'react';
import { DifficultyLevel, Player } from '../../types';

type Props = {
  numPlayers: number;
  setNumPlayers: (value: number) => void;
  difficulty: DifficultyLevel;
  setDifficulty: (difficulty: DifficultyLevel) => void;
  players: Player[];
  onPlayerNameChange: (id: number, name: string) => void;
  onStart: () => void;
  isLoadingWords: boolean;
  onOpenAuth: () => void;
};

export const SetupScreen: React.FC<Props> = ({
  numPlayers,
  setNumPlayers,
  difficulty,
  setDifficulty,
  players,
  onPlayerNameChange,
  onStart,
  isLoadingWords,
  onOpenAuth,
}) => {
  return (
    <div className="h-[100dvh] w-full flex flex-col items-center bg-indigo-950 safe-pt safe-px overflow-hidden">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl p-6 md:p-8 flex flex-col h-full max-h-[92dvh] mb-4 border-2 border-white/20 overflow-hidden">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div className="w-10"></div>
          <div className="text-center">
            <h1 className="text-3xl font-black text-indigo-950 tracking-tighter uppercase leading-none">
              Elio
            </h1>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
              Jokoa
            </p>
          </div>
          <button
            onClick={onOpenAuth}
            className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 shadow-inner"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        <div className="space-y-4 mb-4 shrink-0">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <label className="flex justify-between text-xs font-black text-indigo-900 uppercase mb-2">
              Jokalariak: <span className="text-indigo-600 text-xl">{numPlayers}</span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={numPlayers}
              onChange={(e) => setNumPlayers(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <label className="block text-xs font-black text-indigo-900 uppercase mb-2">
              Maila
            </label>
            <div className="grid grid-cols-4 gap-2 h-12">
              {[1, 2, 3, 4].map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d as DifficultyLevel)}
                  className={`rounded-xl font-black ${
                    difficulty === d
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white text-slate-400 border border-slate-100'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grow overflow-y-auto custom-scrollbar p-2 bg-slate-50/50 rounded-2xl border border-slate-100 shadow-inner mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {players.map((p) => (
              <div
                key={p.id}
                className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col shadow-sm"
              >
                <label className="text-[8px] font-black text-slate-400 uppercase mb-0.5">
                  Jokalaria {p.id + 1}
                </label>
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => onPlayerNameChange(p.id, e.target.value)}
                  className="p-0 bg-transparent border-none focus:ring-0 font-bold text-slate-800 text-base"
                />
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={onStart}
          disabled={isLoadingWords}
          className="w-full bg-indigo-600 text-white font-black py-5 rounded-3xl shadow-lg active:scale-95 transition-all text-xl uppercase tracking-widest shrink-0"
        >
          {isLoadingWords ? 'KARGATZEN...' : 'HASI JOKOA'}
        </button>
      </div>
    </div>
  );
};

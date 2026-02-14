import React from 'react';
import { Player } from '../../types';

type GameMode = 'regular' | 'daily';

type Props = {
  userExists: boolean;
  gameMode: GameMode;
  players: Player[];
  dailyQuestions: number;
  questionsPerPlayer: number;
  onPlayAgain: () => void;
  onReview: () => void;
  onHome: () => void;
};

export const SummaryScreen: React.FC<Props> = ({
  userExists,
  gameMode,
  players,
  dailyQuestions,
  questionsPerPlayer,
  onPlayAgain,
  onReview,
  onHome,
}) => {
  const isSoloLoggedIn = userExists && players.length === 1;
  const player = players[0];
  const score = player?.score || 0;
  const totalQuestions = gameMode === 'daily' ? dailyQuestions : questionsPerPlayer;
  const percentage = ((player?.correctAnswers || 0) / totalQuestions) * 100;
  const sortedPlayers = [...players]
    .filter((p) => p.time > 0)
    .sort((a, b) => (b.score === a.score ? a.time - b.time : b.score - a.score));

  return (
    <div className="h-[100dvh] w-full flex flex-col items-center bg-indigo-950 safe-pt safe-px overflow-hidden">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-6 md:p-8 flex flex-col h-full max-h-[92dvh] border-t-[12px] border-indigo-600 mt-2 mb-6 overflow-hidden">
        <h2 className="text-3xl font-black text-slate-900 uppercase text-center mb-6">
          {isSoloLoggedIn
            ? gameMode === 'daily'
              ? 'Eguneko Lehiaketa'
              : 'Zure Emaitzak'
            : 'Sailkapena'}
        </h2>
        <div className="grow overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50/50 mb-6 flex flex-col">
          {isSoloLoggedIn ? (
            <div className="h-full flex flex-col items-center justify-center p-4 space-y-6">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="transparent"
                    className="text-slate-200"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={351.8}
                    strokeDashoffset={351.8 - (351.8 * percentage) / 100}
                    strokeLinecap="round"
                    className="text-indigo-600 transition-all duration-1000"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-3xl font-black text-indigo-950">{percentage.toFixed(0)}%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full max-w-sm text-center">
                <div className="bg-white p-4 rounded-3xl border border-emerald-100">
                  <p className="text-[9px] font-black uppercase text-emerald-400">Puntuak</p>
                  <p className="text-2xl font-black text-emerald-600">{score}</p>
                </div>
                <div className="bg-white p-4 rounded-3xl border border-rose-100">
                  <p className="text-[9px] font-black uppercase text-rose-400">Asmatuak</p>
                  <p className="text-2xl font-black text-rose-600">{player.correctAnswers}</p>
                </div>
                <div className="bg-white p-4 rounded-3xl border border-indigo-100 col-span-2">
                  <p className="text-[9px] font-black uppercase text-indigo-400">Denbora Totala</p>
                  <p className="text-2xl font-black text-indigo-950">{player.time.toFixed(1)}s</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-y-auto custom-scrollbar grow p-2">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100">
                  <tr>
                    <th className="p-3 text-[9px] font-black uppercase">#</th>
                    <th className="p-3 text-[9px] font-black uppercase">Nor</th>
                    <th className="p-3 text-center text-[9px] font-black uppercase">Pts</th>
                    <th className="p-3 text-right text-[9px] font-black uppercase">S.</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPlayers.map((p, idx) => (
                    <tr key={p.id} className="border-b border-slate-100 bg-white">
                      <td className="p-3 font-black text-xl">{idx + 1}</td>
                      <td className="p-3 font-black text-xs uppercase">{p.name}</td>
                      <td className="p-3 text-center">
                        <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px] font-black">
                          {p.score}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-[10px] text-slate-400">
                        {p.time.toFixed(1)}s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onPlayAgain}
              className={`font-black py-4 rounded-2xl shadow-lg uppercase text-xs active:scale-95 ${
                gameMode === 'daily' ? 'bg-slate-200 text-slate-500' : 'bg-indigo-600 text-white'
              }`}
            >
              {gameMode === 'daily' ? 'Bihar berriro' : 'Berriro'}
            </button>
            <button
              onClick={onReview}
              className="bg-white text-indigo-600 font-black py-4 rounded-2xl shadow-md uppercase text-xs border border-indigo-100 active:scale-95"
            >
              Hitzak
            </button>
          </div>
          <button
            onClick={onHome}
            className="w-full bg-slate-100 text-slate-500 font-black py-3 rounded-xl uppercase text-[10px] active:scale-95"
          >
            Hasiera
          </button>
        </div>
      </div>
    </div>
  );
};

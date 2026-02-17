import React from 'react';
import { Player } from '../../types';
import { AppShell } from '../layout/AppShell';

type GameMode = 'regular' | 'daily';

type Props = {
  userExists: boolean;
  gameMode: GameMode;
  players: Player[];
  questionsPerTurn: number;
  onPlayAgain: () => void;
  onReview: () => void;
  onHome: () => void;
  topRightControl?: React.ReactNode;
};

export const SummaryScreen: React.FC<Props> = ({
  userExists,
  gameMode,
  players,
  questionsPerTurn,
  onPlayAgain,
  onReview,
  onHome,
  topRightControl,
}) => {
  const isSoloLoggedIn = userExists && players.length === 1;
  const player = players[0];
  const score = player?.score || 0;
  const totalQuestions = questionsPerTurn;
  const percentage = ((player?.correctAnswers || 0) / totalQuestions) * 100;
  const sortedPlayers = [...players]
    .filter((p) => p.time > 0)
    .sort((a, b) => (b.score === a.score ? a.time - b.time : b.score - a.score));

  const title = isSoloLoggedIn
    ? gameMode === 'daily'
      ? 'Eguneko Lehiaketa'
      : 'Zure Emaitzak'
    : 'Sailkapena';

  return (
    <AppShell
      topRightControl={topRightControl}
      header={
        <div className="text-center">
          <h2 className="font-display text-2xl font-semibold text-slate-900 md:text-3xl">
            {title}
          </h2>
        </div>
      }
    >
      <div className="space-y-5">
        {isSoloLoggedIn ? (
          <section className="surface-card surface-card--muted p-6">
            <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:items-center">
              <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-full border-8 border-sky-100 bg-white shadow-inner">
                <div className="text-center">
                  <p className="font-display text-5xl font-semibold text-sky-700">
                    {percentage.toFixed(0)}%
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-center">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-sky-700">Puntuak</p>
                  <p className="font-display mt-1 text-3xl font-semibold text-sky-700">
                    {score}
                  </p>
                </div>
                <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-center">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-cyan-700">Asmatuak</p>
                  <p className="font-display mt-1 text-3xl font-semibold text-cyan-700">
                    {player.correctAnswers}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Denbora</p>
                  <p className="font-display mt-1 text-3xl font-semibold text-slate-800">
                    {player.time.toFixed(1)}s
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="surface-card p-3 md:p-4">
            <div className="custom-scrollbar max-h-[60dvh] overflow-y-auto rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="p-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                      #
                    </th>
                    <th className="p-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                      Jokalaria
                    </th>
                    <th className="p-3 text-center text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                      Puntuak
                    </th>
                    <th className="p-3 text-right text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                      Denbora
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPlayers.map((p, index) => (
                    <tr key={p.id} className="border-t border-slate-100 bg-white">
                      <td className="p-3 font-display text-2xl font-semibold text-slate-900">
                        {index + 1}
                      </td>
                      <td className="p-3 text-sm font-semibold text-slate-800">
                        {p.name}
                      </td>
                      <td className="p-3 text-center">
                        <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-700">
                          {p.score}
                        </span>
                      </td>
                      <td className="p-3 text-right text-xs font-semibold text-slate-500">
                        {p.time.toFixed(1)}s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="grid gap-3 sm:grid-cols-3">
          <button
            onClick={onPlayAgain}
            className={
              'btn-primary py-3 sm:col-span-1 ' +
              (gameMode === 'daily' ? 'opacity-55 hover:brightness-100' : '')
            }
          >
            {gameMode === 'daily' ? 'Bihar berriro' : 'Berriro jolastu'}
          </button>
          <button onClick={onReview} className="btn-secondary py-3 sm:col-span-1">
            Partidako hitzak
          </button>
          <button onClick={onHome} className="btn-ghost border border-sky-200 py-3 text-slate-600 sm:col-span-1">
            Hasiera
          </button>
        </section>
      </div>
    </AppShell>
  );
};

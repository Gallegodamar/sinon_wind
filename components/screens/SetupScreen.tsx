import React from 'react';
import { DifficultyLevel, Player } from '../../types';
import { AppShell } from '../layout/AppShell';

type Props = {
  numPlayers: number;
  setNumPlayers: (value: number) => void;
  difficulty: DifficultyLevel;
  setDifficulty: (difficulty: DifficultyLevel) => void;
  canSelectDifficulty: boolean;
  players: Player[];
  onPlayerNameChange: (id: number, name: string) => void;
  onStart: () => void;
  isLoadingWords: boolean;
  onOpenAuth: () => void;
  topRightControl?: React.ReactNode;
};

export const SetupScreen: React.FC<Props> = ({
  numPlayers,
  setNumPlayers,
  difficulty,
  setDifficulty,
  canSelectDifficulty,
  players,
  onPlayerNameChange,
  onStart,
  isLoadingWords,
  onOpenAuth,
  topRightControl,
}) => {
  return (
    <AppShell
      topRightControl={topRightControl}
      header={
        <div className="flex w-full items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900 md:text-2xl">
              Sinonimoak
            </h1>
          </div>
          {!canSelectDifficulty ? (
            <button onClick={onOpenAuth} className="btn-secondary">
              Kontua
            </button>
          ) : null}
        </div>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1.22fr_1fr]">
        <section className="surface-card surface-card--accent p-5 md:p-7">
          <h2 className="font-display mt-3 text-3xl font-semibold leading-[1.05] text-cyan-50 md:text-4xl">
            Jolastu orain
          </h2>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onStart}
              disabled={isLoadingWords}
              className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3.5 text-sm font-extrabold uppercase tracking-[0.09em] text-teal-800 shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isLoadingWords ? 'Kargatzen...' : 'Hasi jolasten'}
            </button>
            {!canSelectDifficulty ? (
              <button
                onClick={onOpenAuth}
                className="inline-flex items-center justify-center rounded-2xl border border-white/35 px-6 py-3.5 text-sm font-bold uppercase tracking-[0.09em] text-white/95 transition hover:bg-white/10"
              >
                Kontuan sartu
              </button>
            ) : null}
          </div>
        </section>

        <section className="surface-card surface-card--muted p-5 md:p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-semibold text-slate-900">
              Konfigurazioa
            </h3>
          </div>

          <div className="mt-5 space-y-5">
            <div>
              <label className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                <span>Jokalari kopurua</span>
                <span className="rounded-full bg-teal-100 px-2.5 py-1 text-teal-700">
                  {numPlayers}
                </span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={numPlayers}
                onChange={(e) => setNumPlayers(parseInt(e.target.value, 10))}
                className="range-input"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                Zailtasuna
              </label>
              {!canSelectDifficulty && (
                <p className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                  Saioa hasi gabe, 1. maila bakarrik erabil daiteke.
                </p>
              )}
              <div className="grid grid-cols-4 gap-2">
                {(canSelectDifficulty ? [1, 2, 3, 4] : [1]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level as DifficultyLevel)}
                    disabled={!canSelectDifficulty && level !== 1}
                    className={
                      'rounded-xl border px-2 py-2.5 text-sm font-bold transition ' +
                      (difficulty === level
                        ? 'border-teal-600 bg-teal-600 text-white shadow-md'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300') +
                      (!canSelectDifficulty && level !== 1
                        ? ' cursor-not-allowed opacity-45 hover:border-slate-200'
                        : '')
                    }
                  >
                    L{level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                Jokalariak
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {players.map((player) => (
                  <label
                    key={player.id}
                    className="rounded-xl border border-slate-200 bg-white/90 p-2.5"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                      Jokalaria {player.id + 1}
                    </span>
                    <input
                      type="text"
                      value={player.name}
                      onChange={(e) =>
                        onPlayerNameChange(player.id, e.target.value)
                      }
                      className="mt-1 w-full border-none bg-transparent p-0 text-sm font-semibold text-slate-900 outline-none"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
};

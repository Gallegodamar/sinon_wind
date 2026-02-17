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
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-sky-200/80 bg-white/80 shadow-[0_12px_20px_-16px_rgba(7,53,111,0.8)]">
              <img
                src="/elio_blue_favicon_64.png"
                alt="Elio"
                className="h-8 w-8 object-contain"
              />
            </span>
            <div>
              <p className="section-label !tracking-[0.16em]">Elio</p>
              <h1 className="font-display text-xl font-bold text-slate-900 md:text-2xl">
                Sinonimoen Jokoa
              </h1>
            </div>
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
        <section className="surface-card surface-card--accent relative overflow-hidden p-5 md:p-7">
          <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-cyan-200/25 blur-2xl" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-sky-200/20 blur-2xl" />
          <p className="section-label !text-cyan-100">Prest?</p>
          <h2 className="font-display mt-2 text-3xl font-semibold leading-[1.05] text-cyan-50 md:text-4xl">
            Jolastu, ikasi eta igo sailkapenean
          </h2>
          <p className="mt-4 max-w-xl text-sm font-medium leading-relaxed text-cyan-50/90">
            Mailaz maila sinonimoak landu, zure ortografia entrenatu eta
            gogoko hitzak txarteletan berrikusi.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onStart}
              disabled={isLoadingWords}
              className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3.5 text-sm font-extrabold uppercase tracking-[0.09em] text-sky-800 shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
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
                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-sky-700">
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
                        ? 'border-sky-600 bg-sky-600 text-white shadow-md shadow-sky-900/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300') +
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

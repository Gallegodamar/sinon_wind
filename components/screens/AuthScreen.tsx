import React from 'react';
import { AppShell } from '../layout/AppShell';

type AuthScreenProps = {
  username: string;
  password: string;
  authError: string | null;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
};

export const AuthScreen: React.FC<AuthScreenProps> = ({
  username,
  password,
  authError,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  onBack,
}) => {
  return (
    <AppShell
      header={
        <div className="flex w-full items-center justify-between gap-3">
          <button onClick={onBack} className="btn-ghost">
            Atzera
          </button>
          <div className="text-center">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Saioa hasi
            </h2>
          </div>
          <div className="w-16" />
        </div>
      }
      contentClassName="flex items-center justify-center"
    >
      <section className="surface-card surface-card--muted w-full max-w-lg p-6 md:p-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-sky-200/80 bg-white/90 shadow-[0_14px_22px_-16px_rgba(7,53,111,0.8)]">
            <img
              src="/elio_blue_favicon_64.png"
              alt="Elio"
              className="h-8 w-8 object-contain"
            />
          </span>
          <div>
            <p className="section-label">Elio kontua</p>
            <h3 className="display-title mt-1">Sartu</h3>
          </div>
        </div>
        <p className="display-subtitle mt-4">
          Zure aurrerapena eta gogoko hitzak sinkronizatzeko, hasi saioa.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.09em] text-slate-500">
              Erabiltzailea
            </span>
            <input
              type="text"
              placeholder="adib. jokalaria01"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              className="input-shell"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.09em] text-slate-500">
              Pasahitza
            </span>
            <input
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="input-shell"
              required
            />
          </label>

          {authError && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">
              {authError}
            </p>
          )}

          <button type="submit" className="btn-primary w-full py-3.5 text-sm">
            Sartu
          </button>
        </form>
      </section>
    </AppShell>
  );
};

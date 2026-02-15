import React from 'react';
import { AppShell } from '../layout/AppShell';

type IntermissionScreenProps = {
  playerName: string;
  playerNumber: number;
  onStart: () => void;
};

export const IntermissionScreen: React.FC<IntermissionScreenProps> = ({
  playerName,
  playerNumber,
  onStart,
}) => {
  return (
    <AppShell contentClassName="flex items-center justify-center">
      <section className="surface-card surface-card--muted w-full max-w-xl p-7 text-center">
        <div className="mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-teal-600 text-3xl font-black text-white shadow-lg">
          {playerNumber}
        </div>
        <h2 className="font-display mt-5 text-4xl font-semibold text-slate-900">
          {playerName}
        </h2>
        <button onClick={onStart} className="btn-primary mt-7 w-full py-3.5">
          Hasi
        </button>
      </section>
    </AppShell>
  );
};

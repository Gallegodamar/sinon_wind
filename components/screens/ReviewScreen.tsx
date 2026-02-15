import React from 'react';
import { WordData } from '../../types';
import { AppShell } from '../layout/AppShell';

type ReviewScreenProps = {
  playedWordData: WordData[];
  onBack: () => void;
  topRightControl?: React.ReactNode;
};

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  playedWordData,
  onBack,
  topRightControl,
}) => {
  return (
    <AppShell
      topRightControl={topRightControl}
      header={
        <div className="flex w-full items-center justify-between gap-3">
          <button onClick={onBack} className="btn-ghost">
            Atzera
          </button>
          <div className="text-center">
            <h2 className="font-display text-lg font-semibold text-slate-900 md:text-xl">
              Partidako Hitzak
            </h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {playedWordData.length}
          </span>
        </div>
      }
    >
      <section className="space-y-3">
        {playedWordData.length === 0 ? (
          <div className="surface-card surface-card--muted p-10 text-center">
            <p className="font-display text-2xl font-semibold text-slate-700">
              Ez dago hitzik berrikusteko
            </p>
          </div>
        ) : (
          playedWordData.map((data, index) => (
            <article
              key={`${data.hitza}-${index}`}
              className="surface-card p-4 md:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-700">
                    #{index + 1}
                  </span>
                  <a
                    href={`https://hiztegiak.elhuyar.eus/eu/${data.hitza}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-display text-2xl font-semibold text-slate-900 transition hover:text-teal-700"
                  >
                    {data.hitza}
                  </a>
                </div>
                <a
                  href={`https://hiztegiak.elhuyar.eus/eu/${data.hitza}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary !py-2 !text-xs"
                >
                  Hiztegia ireki
                </a>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {data.sinonimoak.map((synonym, synonymIndex) => (
                  <a
                    key={`${synonym}-${synonymIndex}`}
                    href={`https://hiztegiak.elhuyar.eus/eu/${synonym}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:text-teal-700"
                  >
                    {synonym}
                  </a>
                ))}
              </div>
            </article>
          ))
        )}
      </section>
    </AppShell>
  );
};

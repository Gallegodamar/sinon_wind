import React from 'react';
import { WordData } from '../../types';

type ReviewScreenProps = {
  playedWordData: WordData[];
  onBack: () => void;
};

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  playedWordData,
  onBack,
}) => {
  return (
    <div className="h-[100dvh] w-full flex flex-col items-center bg-slate-900 safe-pt safe-px overflow-hidden">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-6 flex flex-col h-full max-h-[92dvh] border-t-[12px] border-indigo-600 mt-2 mb-6">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <button
            onClick={onBack}
            className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase active:scale-95"
          >
            Atzera
          </button>
          <h2 className="text-lg font-black text-indigo-950 uppercase tracking-tight">
            Partidako Hitzak
          </h2>
          <div className="w-16"></div>
        </div>
        <div className="grow overflow-y-auto custom-scrollbar space-y-3 p-1">
          {playedWordData.length === 0 ? (
            <p className="text-center py-10 text-[10px] font-black text-slate-300 uppercase italic">
              Ez dago hitzik berrikusteko
            </p>
          ) : (
            playedWordData.map((data, idx) => (
              <div
                key={idx}
                className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-2 shadow-sm group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[8px] font-black">
                      #{idx + 1}
                    </span>
                    <a
                      href={`https://hiztegiak.elhuyar.eus/eu/${data.hitza}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-black text-indigo-950 uppercase flex items-center gap-1 group-hover:text-indigo-600 transition-colors"
                    >
                      {data.hitza}
                      <svg
                        className="h-3 w-3 opacity-30 group-hover:opacity-100 transition-opacity"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          strokeWidth={2}
                        />
                      </svg>
                    </a>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.sinonimoak.map((s, si) => (
                    <a
                      key={si}
                      href={`https://hiztegiak.elhuyar.eus/eu/${s}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white px-3 py-1 rounded-xl border text-[11px] font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center gap-1"
                    >
                      {s}
                      <svg
                        className="h-2 w-2 opacity-20"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          strokeWidth={2}
                        />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        <button
          onClick={onBack}
          className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-lg uppercase mt-4 active:scale-95"
        >
          Itxi
        </button>
      </div>
    </div>
  );
};

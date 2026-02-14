import React from 'react';
import { DifficultyLevel, Player } from '../../types';
import mascot from '../../assets/robin-mascot.svg';

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
    <div className="h-[100dvh] w-full overflow-hidden bg-[#eeedf2] safe-pt safe-px">
      <div className="mx-auto flex h-full w-full max-w-[430px] flex-col overflow-hidden rounded-[2.3rem] border border-[#e2e3ea] bg-[#f7f7fa] shadow-[0_25px_50px_-36px_rgba(0,0,0,0.6)]">
        <div className="grow overflow-y-auto px-4 pb-5">
          <div className="flex items-center justify-between pt-4">
            <div className="w-10" />
            <h1 className="text-[58px] leading-none text-[#2c3241]" style={{ fontFamily: "'Trebuchet MS','Avenir Next',sans-serif" }}>
              Elio
            </h1>
            <button onClick={onOpenAuth} className="rounded-xl p-2 text-[#97a0b3] hover:text-[#5c6478]">
              <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
            </button>
          </div>

          <div className="mt-6 rounded-[1.9rem] border border-[#e4e8e4] bg-[#f8fcf8] px-4 py-5 text-center">
            <div className="mx-auto w-fit rounded-3xl border border-[#d2ddd0] bg-[#f2f7f1] px-4 py-3 text-[#505764]">
              <p className="text-[45px] leading-none" style={{ fontFamily: "'Trebuchet MS','Avenir Next',sans-serif" }}>Minutu bat?</p>
            </div>

            <img src={mascot} alt="Elio" className="mx-auto mt-4 h-40 w-40" draggable={false} />

            <button
              onClick={onStart}
              disabled={isLoadingWords}
              className={
                'mt-4 w-full rounded-2xl py-4 text-[38px] leading-none text-white shadow-md transition-all ' +
                (isLoadingWords
                  ? 'bg-[#c8d0cb] text-[#6a746f]'
                  : 'bg-gradient-to-r from-[#65ca99] to-[#31aa8f] active:scale-[0.995]')
              }
              style={{ fontFamily: "'Trebuchet MS','Avenir Next',sans-serif" }}
            >
              {isLoadingWords ? 'Kargatzen...' : 'Hasi jolasten'}
            </button>

            <button onClick={onOpenAuth} className="mt-5 text-[34px] leading-none text-[#768092]" style={{ fontFamily: "'Trebuchet MS','Avenir Next',sans-serif" }}>
              Ya tengo cuenta
            </button>
          </div>

          <details className="mt-4 rounded-2xl border border-[#e3e6ee] bg-white p-4">
            <summary className="cursor-pointer text-[11px] font-black uppercase tracking-[0.15em] text-[#8f98aa]">Konfigurazio aurreratua</summary>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 flex justify-between text-[11px] font-black uppercase text-[#6b788a]">
                  Jokalariak
                  <span className="text-[#2f8d6f]">{numPlayers}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={numPlayers}
                  onChange={(e) => setNumPlayers(parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-black uppercase text-[#6b788a]">Maila</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d as DifficultyLevel)}
                      className={
                        'rounded-xl py-2 text-sm font-black ' +
                        (difficulty === d
                          ? 'bg-[#30ab8a] text-white'
                          : 'border border-[#e4e7ef] bg-white text-[#8d95a8]')
                      }
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {players.map((p) => (
                  <div key={p.id} className="rounded-xl border border-[#edf0f5] bg-[#fafbfe] p-2">
                    <label className="text-[9px] font-black uppercase text-[#97a1b3]">Jokalaria {p.id + 1}</label>
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => onPlayerNameChange(p.id, e.target.value)}
                      className="w-full bg-transparent p-0 text-sm font-bold text-[#2d3344] outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

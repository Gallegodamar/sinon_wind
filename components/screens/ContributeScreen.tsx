import React from 'react';
import {
  AuthUser,
  DailyLeaderboardEntry,
  DailyRunWithAnswers,
  LeaderboardPeriod,
  PeriodLeaderboardEntry,
  SearchResultItem,
} from '../../appTypes';
import { DifficultyLevel } from '../../types';
import mascot from '../../assets/robin-mascot.svg';

export type ContributeTab = 'home' | 'bilatu' | 'mailak' | 'eguneko';

type Props = {
  user: AuthUser | null;
  onBack: () => void;
  onLogout: () => void;
  activeTab: ContributeTab;
  setActiveTab: (tab: ContributeTab) => void;
  startDailyCompetition: () => void;
  isLoadingWords: boolean;
  hasPlayedToday: boolean;
  isLoadingCompetition: boolean;
  competitionError: string | null;
  dailyLeaderboard: DailyLeaderboardEntry[];
  competitionPeriod: LeaderboardPeriod;
  setCompetitionPeriod: (period: LeaderboardPeriod) => void;
  weeklyLeaderboard: PeriodLeaderboardEntry[];
  monthlyLeaderboard: PeriodLeaderboardEntry[];
  competitionDate: string;
  setCompetitionDate: (date: string) => void;
  dailyRunsByDate: DailyRunWithAnswers[];
  difficulty: DifficultyLevel;
  setDifficulty: (difficulty: DifficultyLevel) => void;
  startNewGame: (isSolo?: boolean) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isSearching: boolean;
  searchResults: SearchResultItem[];
};

const HomeIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 3l7 6v8a1 1 0 01-1 1h-4v-5H8v5H4a1 1 0 01-1-1V9l7-6z" />
  </svg>
);

const FlameIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M11 2s1 3-1 5c-1.2 1.2-.9 2.7-.2 3.6.6.9 1.6 1.4 2.7 1.4 1.4 0 2.7-.7 3.7-2 .8 1.2 1 2.3 1 3.1 0 3-2.5 5.4-5.6 5.4C8.5 18.5 6 16 6 13c0-2.6 1.6-4.3 3.2-5.8C11.7 4.8 11 2 11 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
  </svg>
);

const CrownIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M3 6l3 3 4-5 4 5 3-3-1.5 9h-11L3 6z" />
  </svg>
);

const UserIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 8a7 7 0 1114 0H3z" clipRule="evenodd" />
  </svg>
);

const DailyIcon = () => (
  <svg className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M6 2a1 1 0 012 0v1h4V2a1 1 0 112 0v1h1a2 2 0 012 2v3H3V5a2 2 0 012-2h1V2zm11 8H3v5a2 2 0 002 2h10a2 2 0 002-2v-5zm-9 2.3l1.2 1.2 3-3 1.1 1.1-4.1 4.1-2.3-2.3 1.1-1.1z" clipRule="evenodd" />
  </svg>
);

export const ContributeScreen: React.FC<Props> = ({
  user,
  onBack,
  onLogout,
  activeTab,
  setActiveTab,
  startDailyCompetition,
  isLoadingWords,
  hasPlayedToday,
  isLoadingCompetition,
  competitionError,
  dailyLeaderboard,
  competitionPeriod,
  setCompetitionPeriod,
  weeklyLeaderboard,
  monthlyLeaderboard,
  competitionDate,
  setCompetitionDate,
  dailyRunsByDate,
  difficulty,
  setDifficulty,
  startNewGame,
  searchTerm,
  setSearchTerm,
  isSearching,
  searchResults,
}) => {
  const levelColors = {
    1: 'bg-sky-50 text-sky-600 border-sky-100',
    2: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    3: 'bg-amber-50 text-amber-600 border-amber-100',
    4: 'bg-rose-50 text-rose-600 border-rose-100',
  };

  const greetingName = user?.email?.split('@')[0] || 'Kaixo';

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-[#eeedf2] safe-pt safe-px">
      <style>{`
        @keyframes mascot-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
      `}</style>

      <div className="mx-auto flex h-full w-full max-w-[430px] flex-col overflow-hidden rounded-[2.3rem] border border-[#e2e3ea] bg-[#f7f7fa] shadow-[0_25px_50px_-36px_rgba(0,0,0,0.6)]">
        <div className="shrink-0 px-4 pb-2 pt-3 text-[#5f6374]">
          <div className="flex items-center justify-between">
            <button onClick={onBack} className="rounded-xl px-2 py-1 text-[11px] font-black uppercase tracking-wide text-[#9ba1b0] hover:text-[#5f6374]">
              Atzera
            </button>
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#a4a9b6]">ELIO</span>
            <button onClick={onLogout} className="rounded-xl px-2 py-1 text-[11px] font-black uppercase tracking-wide text-[#9ba1b0] hover:text-[#5f6374]">
              Irten
            </button>
          </div>
        </div>

        <div className="custom-scrollbar grow overflow-y-auto px-4 pb-4">
          {activeTab === 'home' && (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-[1.8rem] border border-[#e2e8e0] bg-[#f8fcf8] px-3 pt-3">
                <div className="flex items-start gap-3">
                  <img
                    src={mascot}
                    alt="Elio"
                    draggable={false}
                    className="h-28 w-28 shrink-0 select-none"
                    style={{ animation: 'mascot-float 3.8s ease-in-out infinite' }}
                  />

                  <div className="mt-1 rounded-3xl border border-[#d2ddd0] bg-[#f2f7f1] px-4 py-3 text-[#4e5562]">
                    <p className="text-[13px] font-bold">Kaixo!</p>
                    <p className="text-[39px] leading-none" style={{ fontFamily: "'Trebuchet MS','Avenir Next',sans-serif" }}>
                      Gaur minutu bat daukazu?
                    </p>
                  </div>
                </div>

                <button
                  onClick={startDailyCompetition}
                  disabled={isLoadingWords || hasPlayedToday}
                  className={
                    'mt-2 flex w-full items-center justify-between rounded-2xl px-4 py-3 font-black text-white shadow-[0_14px_22px_-18px_rgba(0,0,0,0.45)] transition-all ' +
                    (isLoadingWords || hasPlayedToday
                      ? 'bg-[#b8c5be] text-[#5f6b66]'
                      : 'bg-gradient-to-r from-[#64c998] to-[#2fab8f] active:scale-[0.995]')
                  }
                >
                  <div className="flex items-center gap-3">
                    <DailyIcon />
                    <div className="text-left">
                      <p className="text-[34px] leading-none" style={{ fontFamily: "'Trebuchet MS','Avenir Next',sans-serif" }}>
                        Gaurko jokoa
                      </p>
                    </div>
                  </div>
                  <span className="text-3xl leading-none">›</span>
                </button>
                <div className="h-3" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => setActiveTab('mailak')} className="rounded-2xl border border-[#e3e5ed] bg-white p-3 text-center shadow-sm">
                  <div className="mx-auto mb-2 h-11 w-11 rounded-xl bg-[#edf8f2] p-2 text-[#58b798]"><CheckIcon /></div>
                  <p className="text-[18px] leading-tight text-[#4b5160]" style={{ fontFamily: "'Trebuchet MS','Avenir Next',sans-serif" }}>Hitzak ikasi</p>
                </button>

                <button onClick={() => setActiveTab('bilatu')} className="rounded-2xl border border-[#e3e5ed] bg-white p-3 text-center shadow-sm">
                  <div className="mx-auto mb-2 h-11 w-11 rounded-xl bg-[#ecf3fb] p-2 text-[#5ca5d7]"><FlameIcon /></div>
                  <p className="text-[18px] leading-tight text-[#4b5160]" style={{ fontFamily: "'Trebuchet MS','Avenir Next',sans-serif" }}>Sinonimoak</p>
                </button>

                <button onClick={() => setActiveTab('eguneko')} className="rounded-2xl border border-[#e3e5ed] bg-white p-3 text-center shadow-sm">
                  <div className="mx-auto mb-2 h-11 w-11 rounded-xl bg-[#eef8ec] p-2 text-[#75b56a]"><CrownIcon /></div>
                  <p className="text-[18px] leading-tight text-[#4b5160]" style={{ fontFamily: "'Trebuchet MS','Avenir Next',sans-serif" }}>Adizkiak</p>
                </button>
              </div>

              <div className="rounded-2xl border border-[#e3eadf] bg-[#f6fbf5] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[35px] leading-none text-[#2f3747]" style={{ fontFamily: "'Trebuchet MS','Avenir Next',sans-serif" }}>Guribarlario</h3>
                  <button onClick={() => setActiveTab('eguneko')} className="text-[11px] font-black uppercase text-[#53b49a]">Ikusi guztiak</button>
                </div>

                {isLoadingCompetition ? (
                  <p className="text-[11px] font-black uppercase text-slate-400">Kargatzen...</p>
                ) : competitionError ? (
                  <p className="text-[11px] font-black text-rose-500">{competitionError}</p>
                ) : dailyLeaderboard.length === 0 ? (
                  <p className="text-[11px] font-black uppercase text-slate-300">Oraindik ez dago emaitzarik.</p>
                ) : (
                  <div className="space-y-2">
                    {dailyLeaderboard.slice(0, 4).map((entry, idx) => (
                      <div key={entry.id} className={`flex items-center justify-between rounded-xl px-3 py-2 ${idx === 0 ? 'bg-[#e8f4ea]' : 'border border-[#eceff2] bg-white'}`}>
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d9ece0] text-[11px] font-black text-[#409273]">{entry.rank}</span>
                          <span className="text-[28px] leading-none text-[#465068]" style={{ fontFamily: "'Trebuchet MS','Avenir Next',sans-serif" }}>{entry.player_name}</span>
                        </div>
                        <span className="text-[36px] leading-none text-[#37a96d]" style={{ fontFamily: "'Trebuchet MS','Avenir Next',sans-serif" }}>{entry.score}p</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'mailak' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <label className="mb-2 block text-center text-[10px] font-black uppercase text-slate-400">Maila Aldatu</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d as DifficultyLevel)}
                      className={
                        'flex-1 rounded-xl py-3 text-sm font-black transition-all ' +
                        (difficulty === d ? 'bg-[#30ab8a] text-white shadow-md' : 'border border-slate-100 bg-white text-slate-400')
                      }
                    >
                      L{d}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => startNewGame(true)}
                  disabled={isLoadingWords}
                  className="mt-4 w-full rounded-2xl bg-[#2f8d6f] py-5 text-xl font-black uppercase tracking-widest text-white shadow-lg"
                >
                  {isLoadingWords ? 'KARGATZEN...' : 'BAKARKA JOLASTU'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'bilatu' && (
            <div className="space-y-3">
              <div className="relative mb-2 shrink-0">
                <input
                  type="text"
                  placeholder="Bilatu hitzak edo sinonimoak..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-12 font-bold text-indigo-950 outline-none focus:ring-2 focus:ring-[#2f8d6f]"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth={2} /></svg>
                </span>
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                  </button>
                )}
              </div>

              {isSearching ? (
                <p className="text-[10px] font-black uppercase text-slate-400">Bilatzen...</p>
              ) : searchResults.length === 0 ? (
                <p className="text-[10px] font-black uppercase text-slate-300">{searchTerm.length < 2 ? 'Idatzi gutxienez 2 letra bilatzeko' : 'Ez da emaitzarik aurkitu'}</p>
              ) : (
                searchResults.map((word, idx) => (
                  <div key={`${word.id}-${idx}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <a href={`https://hiztegiak.elhuyar.eus/eu/${word.hitza}`} target="_blank" rel="noopener noreferrer" className="text-lg font-black uppercase text-indigo-950">{word.hitza}</a>
                      <span className={'rounded-lg border px-2 py-0.5 text-[9px] font-black ' + (levelColors[word.level as DifficultyLevel] || 'bg-slate-50')}>L{word.level}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {word.sinonimoak.map((s, i) => (
                        <a key={i} href={`https://hiztegiak.elhuyar.eus/eu/${s}`} target="_blank" rel="noopener noreferrer" className="rounded-xl border bg-white px-3 py-1 text-[11px] font-bold text-slate-600">{s}</a>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'eguneko' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex gap-2">
                  {(['daily', 'weekly', 'monthly'] as LeaderboardPeriod[]).map((period) => (
                    <button
                      key={period}
                      onClick={() => setCompetitionPeriod(period)}
                      className={
                        'rounded-xl px-3 py-1.5 text-[10px] font-black uppercase ' +
                        (competitionPeriod === period ? 'bg-[#30ab8a] text-white' : 'border border-slate-200 bg-white text-slate-400')
                      }
                    >
                      {period === 'daily' ? 'Gaur' : period === 'weekly' ? 'Astea' : 'Hilabetea'}
                    </button>
                  ))}
                </div>

                {isLoadingCompetition ? (
                  <p className="text-[10px] font-black uppercase text-slate-400">Kargatzen...</p>
                ) : competitionError ? (
                  <p className="text-[10px] font-black text-rose-500">{competitionError}</p>
                ) : competitionPeriod === 'daily' ? (
                  dailyLeaderboard.length === 0 ? (
                    <p className="text-[10px] font-black uppercase text-slate-300">Oraindik ez dago emaitzarik.</p>
                  ) : (
                    <div className="space-y-2">
                      {dailyLeaderboard.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3">
                          <div>
                            <p className="text-xs font-black uppercase text-indigo-950">#{entry.rank} {entry.player_name}</p>
                            <p className="text-[10px] font-black uppercase text-slate-400">{entry.correct}/{entry.total} - {entry.time_seconds.toFixed(1)}s</p>
                          </div>
                          <span className="text-lg font-black text-[#2f8d6f]">{entry.score}</span>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="space-y-2">
                    {(competitionPeriod === 'weekly' ? weeklyLeaderboard : monthlyLeaderboard).length === 0 ? (
                      <p className="text-[10px] font-black uppercase text-slate-300">Oraindik ez dago emaitzarik.</p>
                    ) : (
                      (competitionPeriod === 'weekly' ? weeklyLeaderboard : monthlyLeaderboard).map((entry) => (
                        <div key={entry.user_id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3">
                          <div>
                            <p className="text-xs font-black uppercase text-indigo-950">#{entry.rank} {entry.player_name}</p>
                            <p className="text-[10px] font-black uppercase text-slate-400">{entry.games_played} partida - {entry.total_correct}/{entry.total_questions}</p>
                          </div>
                          <span className="text-lg font-black text-[#2f8d6f]">{entry.total_score}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Partidak eta Erantzunak</span>
                  <input type="date" value={competitionDate} onChange={(e) => setCompetitionDate(e.target.value)} className="rounded-lg border border-slate-200 bg-white p-2 text-[11px] font-black text-[#2f8d6f] outline-none" />
                </div>
                {dailyRunsByDate.length === 0 ? (
                  <p className="text-[10px] font-black uppercase text-slate-300">Egun honetarako ez dago partidarik.</p>
                ) : (
                  <div className="space-y-2">
                    {dailyRunsByDate.map((run) => (
                      <details key={run.id} className="rounded-xl border border-slate-100 bg-white p-3">
                        <summary className="flex cursor-pointer list-none items-center justify-between">
                          <span className="text-xs font-black uppercase text-indigo-950">{run.player_name}</span>
                          <span className="text-[11px] font-black text-[#2f8d6f]">{run.score} pts</span>
                        </summary>
                        <div className="mt-2 space-y-1">
                          <p className="text-[10px] font-black uppercase text-slate-400">{run.correct}/{run.total} - {run.time_seconds.toFixed(1)}s</p>
                          {run.answers.map((ans) => (
                            <div key={`${run.id}-${ans.question_index}`} className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600">
                              #{ans.question_index + 1} {ans.hitza}: {ans.chosen} {ans.is_correct ? 'OK' : `X (${ans.correct})`} [{ans.points} pts]
                            </div>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[#e3e6ee] bg-white/90 px-3 py-2 backdrop-blur">
          <div className="grid grid-cols-5 gap-2">
            {([
              { id: 'home', icon: <HomeIcon /> },
              { id: 'mailak', icon: <FlameIcon /> },
              { id: 'eguneko', icon: <CheckIcon /> },
              { id: 'eguneko', icon: <CrownIcon /> },
              { id: 'bilatu', icon: <UserIcon /> },
            ] as const).map((tab, i) => {
              const isActive = activeTab === tab.id || (i === 2 && activeTab === 'eguneko');
              return (
                <button
                  key={`${tab.id}-${i}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={
                    'flex flex-col items-center rounded-xl py-2 text-[10px] font-black uppercase transition-all ' +
                    (isActive ? 'text-[#3dad8a]' : 'text-[#b8bdcb]')
                  }
                >
                  {tab.icon}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

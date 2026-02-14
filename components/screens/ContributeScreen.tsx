import React from 'react';
import {
  AuthUser,
  DailyLeaderboardEntry,
  DailyRunWithAnswers,
  LeaderboardPeriod,
  PeriodLeaderboardEntry,
  SearchResultItem,
} from '../../appTypes';
import { DifficultyLevel, GameStatus } from '../../types';

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
    <div className="h-[100dvh] w-full flex flex-col items-center bg-indigo-950 safe-pt safe-px overflow-hidden">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-6 md:p-8 flex flex-col h-full max-h-[92dvh] mb-4">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <button onClick={onBack} className="text-xs font-black text-slate-400 uppercase">
            Atzera
          </button>
          <h2 className="text-xl font-black text-indigo-950 uppercase">Menua</h2>
          <button
            onClick={onLogout}
            className="bg-slate-100 text-slate-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase"
          >
            Irten
          </button>
        </div>

        <div className="grow overflow-y-auto custom-scrollbar pr-1 pb-4">
          {activeTab === 'home' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Kaixo, {greetingName}
                </p>
                <p className="text-xl font-black text-indigo-950">
                  Gaurko jokoa prest dago
                </p>
                <p className="text-[11px] font-bold text-slate-500 mt-1">
                  10 sinonimo, maila guztiak, eguneko partida bakarra.
                </p>
                <button
                  onClick={startDailyCompetition}
                  disabled={isLoadingWords}
                  className={
                    'w-full mt-3 py-4 rounded-2xl font-black uppercase text-sm ' +
                    (isLoadingWords
                      ? 'bg-slate-200 text-slate-500'
                      : 'bg-emerald-500 text-white shadow-lg')
                  }
                >
                  {isLoadingWords ? 'KARGATZEN...' : 'Gaurko jokoa'}
                </button>
                {hasPlayedToday && (
                  <p className="mt-2 text-[10px] font-black text-slate-400 uppercase">
                    Oharra: gaurko emaitza baduzu, gordetzean blokeatuko da partida bikoitza.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveTab('mailak')}
                  className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left"
                >
                  <p className="text-xs font-black text-indigo-950 uppercase">
                    Sinonimoak mailaka
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 mt-1">
                    Aukeratu maila eta jolastu
                  </p>
                </button>
                <button
                  onClick={() => setActiveTab('bilatu')}
                  className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left"
                >
                  <p className="text-xs font-black text-indigo-950 uppercase">
                    Bilaketa
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 mt-1">
                    Hitzak eta sinonimoak ikusi
                  </p>
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-indigo-950 uppercase">
                    Guribarlario (Gaur)
                  </h3>
                  <button
                    onClick={() => setActiveTab('eguneko')}
                    className="text-[10px] font-black text-indigo-600 uppercase"
                  >
                    Ikusi guztiak
                  </button>
                </div>
                {isLoadingCompetition ? (
                  <p className="text-[10px] font-black text-slate-400 uppercase">
                    Kargatzen...
                  </p>
                ) : dailyLeaderboard.length === 0 ? (
                  <p className="text-[10px] font-black text-slate-300 uppercase">
                    Oraindik ez dago emaitzarik.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dailyLeaderboard.slice(0, 5).map((entry) => (
                      <div
                        key={entry.id}
                        className="bg-white border border-slate-100 rounded-xl p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-black text-indigo-950 uppercase">
                            #{entry.rank} {entry.player_name}
                          </p>
                          <p className="text-[10px] font-black text-slate-400 uppercase">
                            {entry.correct}/{entry.total}
                          </p>
                        </div>
                        <span className="text-lg font-black text-indigo-600">
                          {entry.score}p
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'mailak' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <label className="text-[10px] font-black text-slate-400 uppercase text-center block mb-2">
                  Maila Aldatu
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d as DifficultyLevel)}
                      className={
                        'flex-1 py-3 rounded-xl font-black text-sm transition-all ' +
                        (difficulty === d
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-white border border-slate-100 text-slate-400')
                      }
                    >
                      L{d}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => startNewGame(true)}
                  disabled={isLoadingWords}
                  className="w-full bg-indigo-600 text-white font-black py-5 rounded-3xl shadow-lg mt-4 active:scale-95 text-xl uppercase tracking-widest"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-12 py-4 font-bold text-indigo-950 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    strokeWidth={2}
                  />
                </svg>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>
              {isSearching ? (
                <p className="text-[10px] font-black text-slate-400 uppercase">
                  Bilatzen...
                </p>
              ) : searchResults.length === 0 ? (
                <p className="text-[10px] font-black text-slate-300 uppercase">
                  {searchTerm.length < 2
                    ? 'Idatzi gutxienez 2 letra bilatzeko'
                    : 'Ez da emaitzarik aurkitu'}
                </p>
              ) : (
                searchResults.map((word, idx) => (
                  <div
                    key={`${word.id}-${idx}`}
                    className="bg-slate-50 p-4 rounded-2xl border border-slate-100"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <a
                        href={`https://hiztegiak.elhuyar.eus/eu/${word.hitza}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-black text-indigo-950 uppercase"
                      >
                        {word.hitza}
                      </a>
                      <span
                        className={
                          'px-2 py-0.5 rounded-lg border text-[9px] font-black ' +
                          (levelColors[word.level as DifficultyLevel] || 'bg-slate-50')
                        }
                      >
                        L{word.level}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {word.sinonimoak.map((s, i) => (
                        <a
                          key={i}
                          href={`https://hiztegiak.elhuyar.eus/eu/${s}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white px-3 py-1 rounded-xl border text-[11px] font-bold text-slate-600"
                        >
                          {s}
                        </a>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'eguneko' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <div className="flex gap-2 mb-3">
                  {(['daily', 'weekly', 'monthly'] as LeaderboardPeriod[]).map(
                    (period) => (
                      <button
                        key={period}
                        onClick={() => setCompetitionPeriod(period)}
                        className={
                          'px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ' +
                          (competitionPeriod === period
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-400 border border-slate-200')
                        }
                      >
                        {period === 'daily'
                          ? 'Gaur'
                          : period === 'weekly'
                            ? 'Astea'
                            : 'Hilabetea'}
                      </button>
                    )
                  )}
                </div>

                {isLoadingCompetition ? (
                  <p className="text-[10px] font-black text-slate-400 uppercase">
                    Kargatzen...
                  </p>
                ) : competitionPeriod === 'daily' ? (
                  dailyLeaderboard.length === 0 ? (
                    <p className="text-[10px] font-black text-slate-300 uppercase">
                      Oraindik ez dago emaitzarik.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {dailyLeaderboard.map((entry) => (
                        <div
                          key={entry.id}
                          className="bg-white border border-slate-100 rounded-xl p-3 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-black text-indigo-950 uppercase">
                              #{entry.rank} {entry.player_name}
                            </p>
                            <p className="text-[10px] font-black text-slate-400 uppercase">
                              {entry.correct}/{entry.total} - {entry.time_seconds.toFixed(1)}s
                            </p>
                          </div>
                          <span className="text-lg font-black text-indigo-600">
                            {entry.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="space-y-2">
                    {(competitionPeriod === 'weekly'
                      ? weeklyLeaderboard
                      : monthlyLeaderboard
                    ).length === 0 ? (
                      <p className="text-[10px] font-black text-slate-300 uppercase">
                        Oraindik ez dago emaitzarik.
                      </p>
                    ) : (
                      (competitionPeriod === 'weekly'
                        ? weeklyLeaderboard
                        : monthlyLeaderboard
                      ).map((entry) => (
                        <div
                          key={entry.user_id}
                          className="bg-white border border-slate-100 rounded-xl p-3 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-black text-indigo-950 uppercase">
                              #{entry.rank} {entry.player_name}
                            </p>
                            <p className="text-[10px] font-black text-slate-400 uppercase">
                              {entry.games_played} partida - {entry.total_correct}/
                              {entry.total_questions}
                            </p>
                          </div>
                          <span className="text-lg font-black text-indigo-600">
                            {entry.total_score}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Partidak eta Erantzunak
                  </span>
                  <input
                    type="date"
                    value={competitionDate}
                    onChange={(e) => setCompetitionDate(e.target.value)}
                    className="text-[11px] font-black bg-white border border-slate-200 rounded-lg p-2 text-indigo-600 outline-none"
                  />
                </div>
                {dailyRunsByDate.length === 0 ? (
                  <p className="text-[10px] font-black text-slate-300 uppercase">
                    Egun honetarako ez dago partidarik.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dailyRunsByDate.map((run) => (
                      <details
                        key={run.id}
                        className="bg-white border border-slate-100 rounded-xl p-3"
                      >
                        <summary className="cursor-pointer list-none flex items-center justify-between">
                          <span className="text-xs font-black text-indigo-950 uppercase">
                            {run.player_name}
                          </span>
                          <span className="text-[11px] font-black text-indigo-600">
                            {run.score} pts
                          </span>
                        </summary>
                        <div className="mt-2 space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase">
                            {run.correct}/{run.total} - {run.time_seconds.toFixed(1)}s
                          </p>
                          {run.answers.map((ans) => (
                            <div
                              key={`${run.id}-${ans.question_index}`}
                              className="text-[11px] font-bold text-slate-600 bg-slate-50 rounded-lg px-2 py-1"
                            >
                              #{ans.question_index + 1} {ans.hitza}: {ans.chosen}{' '}
                              {ans.is_correct ? '✓' : `✗ (${ans.correct})`} [{ans.points} pts]
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

        <div className="mt-4 shrink-0 pt-3 border-t border-slate-100">
          <div className="grid grid-cols-4 gap-2">
            {(['home', 'eguneko', 'mailak', 'bilatu'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={
                  'py-2 rounded-xl text-[10px] font-black uppercase ' +
                  (activeTab === tab
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-400')
                }
              >
                {tab === 'home'
                  ? 'Home'
                  : tab === 'eguneko'
                    ? 'Eguneko'
                    : tab === 'mailak'
                      ? 'Mailak'
                      : 'Bilatu'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

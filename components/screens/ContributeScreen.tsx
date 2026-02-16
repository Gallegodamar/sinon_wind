import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DictionaryMeaning,
  DailyLeaderboardEntry,
  DailyRunWithAnswers,
  LeaderboardPeriod,
  OrthographyPoolWord,
  PeriodLeaderboardEntry,
  SearchResultItem,
  UserAnswerStatRow,
} from '../../appTypes';
import { DifficultyLevel, WordData } from '../../types';
import {
  fetchOrthographyWordPool,
  fetchWordsByLevel,
  lookupDictionaryMeaning,
  fetchUserAnswerStatsRows,
} from '../../lib/supabaseRepo';
import { AppShell } from '../layout/AppShell';
import { formatLocalDate } from '../../lib/dateUtils';

export type ContributeTab =
  | 'home'
  | 'bilatu'
  | 'mailak'
  | 'ortografia'
  | 'txartelak'
  | 'eguneko'
  | 'estatistikak';

type Props = {
  onBack: () => void;
  topRightControl?: React.ReactNode;
  userId: string;
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
  activeChallengeDate: string;
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

const SearchIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M8.5 3a5.5 5.5 0 014.375 8.834l3.646 3.646a1 1 0 01-1.414 1.414l-3.646-3.646A5.5 5.5 0 118.5 3zm0 2a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"
      clipRule="evenodd"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z"
      clipRule="evenodd"
    />
  </svg>
);

const CardsIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M4 4a2 2 0 012-2h7a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v9h7V4H6zm-3 4a1 1 0 011-1h1v2H4a1 1 0 01-1-1zm14 7h-1v-2h1a1 1 0 110 2z" />
  </svg>
);

const SpellIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10.9 3.2a2.8 2.8 0 00-4 0L2.7 7.4a2.8 2.8 0 000 4l5.9 5.9a2.8 2.8 0 004 0l4.2-4.2a2.8 2.8 0 000-4l-5.9-5.9zm-2.8 1.2a1.1 1.1 0 011.6 0l5.9 5.9a1.1 1.1 0 010 1.6l-.8.8-7.5-7.5.8-.8zm5.4 9.5l-2.1 2.1a1.1 1.1 0 01-1.6 0l-5.9-5.9a1.1 1.1 0 010-1.6l2.1-2.1 7.5 7.5z" />
  </svg>
);

const CrownIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M3 6l3 3 4-5 4 5 3-3-1.5 9h-11L3 6z" />
  </svg>
);

const StatsIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M3 3h2v14H3V3zm6 5h2v9H9V8zm6-4h2v13h-2V4z" />
  </svg>
);

const DailyIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M6 2a1 1 0 012 0v1h4V2a1 1 0 112 0v1h1a2 2 0 012 2v3H3V5a2 2 0 012-2h1V2zm11 8H3v5a2 2 0 002 2h10a2 2 0 002-2v-5zm-9 2.3l1.2 1.2 3-3 1.1 1.1-4.1 4.1-2.3-2.3 1.1-1.1z"
      clipRule="evenodd"
    />
  </svg>
);

const MedalIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M6 2h3l1 3h-2l-2-3zm5 0h3l-2 3h-2l1-3z" />
    <path
      fillRule="evenodd"
      d="M10 6a4.5 4.5 0 100 9 4.5 4.5 0 000-9zm-1.4 2.1c.2-.2.6-.2.8 0l.6.6.6-.6a.6.6 0 11.8.8l-.6.6.6.6a.6.6 0 11-.8.8l-.6-.6-.6.6a.6.6 0 11-.8-.8l.6-.6-.6-.6a.6.6 0 010-.8z"
      clipRule="evenodd"
    />
  </svg>
);

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

type RankMedalStyle = {
  label: string;
  containerClass: string;
  iconClass: string;
};

const getRankMedalStyle = (rank: number): RankMedalStyle | null => {
  if (rank === 1) {
    return {
      label: 'Urrea',
      containerClass: 'border-amber-200 bg-amber-50 text-amber-700',
      iconClass: 'bg-amber-200 text-amber-800',
    };
  }
  if (rank === 2) {
    return {
      label: 'Zilarra',
      containerClass: 'border-slate-200 bg-slate-50 text-slate-700',
      iconClass: 'bg-slate-200 text-slate-800',
    };
  }
  if (rank === 3) {
    return {
      label: 'Brontzea',
      containerClass: 'border-orange-200 bg-orange-50 text-orange-700',
      iconClass: 'bg-orange-200 text-orange-800',
    };
  }
  return null;
};

const WEEKDAY_SHORT_FORMATTER = new Intl.DateTimeFormat('eu-ES', {
  weekday: 'short',
});

const formatWeekdayShort = (date: Date): string =>
  WEEKDAY_SHORT_FORMATTER.format(date).replace('.', '').slice(0, 3);

const ORTHOGRAPHY_DAILY_TOTAL = 10;
const ORTHOGRAPHY_STORAGE_PREFIX = 'ortografia_daily_v1';
const ORTHOGRAPHY_TRIGGER_REGEX = /(tx|tz|ts|ih|s|x|z|c)/i;

type OrthographyQuestion = {
  sourceId: string;
  hitza: string;
  clue: string;
  source: OrthographyPoolWord['source'];
  options: [string, string, string];
  correctIndex: number;
};

type OrthographySession = {
  date: string;
  questions: OrthographyQuestion[];
  answers: number[];
  currentIndex: number;
};

const ORTHOGRAPHY_RULES: ReadonlyArray<readonly [string, string]> = [
  ['tx', 'xt'],
  ['tz', 'zt'],
  ['ts', 'st'],
  ['ih', 'hi'],
  ['s', 'x'],
  ['x', 's'],
  ['s', 'z'],
  ['z', 's'],
  ['c', 'k'],
  ['k', 'c'],
];

const normalizeOrthographyWord = (value: string): string =>
  value.trim().toLowerCase();

const seededHash = (seed: string): number => {
  let hash = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return hash >>> 0;
};

const createSeededRandom = (seed: string): (() => number) => {
  let state = seededHash(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffleWithRandom = <T,>(items: T[], random: () => number): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const collectRuleMutations = (word: string, from: string, to: string): string[] => {
  const matches: string[] = [];
  let index = word.indexOf(from);
  while (index >= 0) {
    matches.push(word.slice(0, index) + to + word.slice(index + from.length));
    index = word.indexOf(from, index + 1);
  }
  return matches;
};

const buildOrthographyCandidates = (word: string): string[] => {
  const candidates = new Set<string>();
  const normalized = normalizeOrthographyWord(word);

  const addCandidate = (value: string) => {
    const candidate = normalizeOrthographyWord(value);
    if (!candidate || candidate === normalized || candidate.length < 2) return;
    candidates.add(candidate);
  };

  ORTHOGRAPHY_RULES.forEach(([from, to]) => {
    collectRuleMutations(normalized, from, to).forEach(addCandidate);
  });

  if (candidates.size < 2 && normalized.length >= 4) {
    for (let i = 0; i < normalized.length - 1; i += 1) {
      if (normalized[i] === normalized[i + 1]) continue;
      addCandidate(
        normalized.slice(0, i) +
          normalized[i + 1] +
          normalized[i] +
          normalized.slice(i + 2)
      );
    }
  }

  if (candidates.size < 2) {
    const vowelSwap: Record<string, string> = {
      a: 'e',
      e: 'a',
      i: 'e',
      o: 'u',
      u: 'o',
    };
    for (let i = 0; i < normalized.length; i += 1) {
      const replacement = vowelSwap[normalized[i]];
      if (!replacement) continue;
      addCandidate(
        normalized.slice(0, i) + replacement + normalized.slice(i + 1)
      );
    }
  }

  return Array.from(candidates);
};

const buildOrthographyQuestions = (
  words: OrthographyPoolWord[],
  dateKey: string,
  total: number
): OrthographyQuestion[] => {
  const uniqueWords = new Map<string, OrthographyPoolWord>();
  words.forEach((word) => {
    const normalized = normalizeOrthographyWord(word.hitza);
    if (
      normalized.length < 3 ||
      !ORTHOGRAPHY_TRIGGER_REGEX.test(normalized) ||
      uniqueWords.has(normalized)
    ) {
      return;
    }
    uniqueWords.set(normalized, word);
  });

  const orderedWords = Array.from(uniqueWords.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, word]) => word);

  const random = createSeededRandom(`ortografia:${dateKey}`);
  const randomized = shuffleWithRandom(orderedWords, random);

  const candidateQuestions: OrthographyQuestion[] = [];
  for (const word of randomized) {
    const normalizedWord = normalizeOrthographyWord(word.hitza);
    const candidates = shuffleWithRandom(
      buildOrthographyCandidates(normalizedWord),
      random
    );
    if (candidates.length < 2) continue;

    const wrongOptions = candidates.slice(0, 2);
    const options = shuffleWithRandom(
      [normalizedWord, ...wrongOptions],
      random
    );
    if (new Set(options).size !== 3) continue;

    const correctIndex = options.indexOf(normalizedWord);
    if (correctIndex < 0) continue;

    const normalizedClue = word.clue.replace(/\s+/g, ' ').trim();
    const hiddenClue = normalizedClue
      ? normalizedClue.replace(
          new RegExp(
            normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            'ig'
          ),
          '_____'
        )
      : '';
    const clue =
      hiddenClue && hiddenClue.trim().length > 0
        ? hiddenClue
        : 'Aukeratu ondo idatzitako hitza.';

    candidateQuestions.push({
      sourceId: word.sourceId,
      hitza: normalizedWord,
      clue,
      source: word.source,
      options: options as [string, string, string],
      correctIndex,
    });
  }

  const bySource = {
    synonyms: shuffleWithRandom(
      candidateQuestions.filter((question) => question.source === 'synonyms'),
      random
    ),
    dictionary: shuffleWithRandom(
      candidateQuestions.filter((question) => question.source === 'dictionary'),
      random
    ),
  };

  const selected: OrthographyQuestion[] = [];
  const selectedWords = new Set<string>();
  const addQuestion = (question: OrthographyQuestion | undefined) => {
    if (!question) return;
    if (selectedWords.has(question.hitza)) return;
    selected.push(question);
    selectedWords.add(question.hitza);
  };

  if (bySource.synonyms.length > 0 && bySource.dictionary.length > 0) {
    addQuestion(bySource.synonyms[0]);
    addQuestion(bySource.dictionary[0]);
  }

  shuffleWithRandom(candidateQuestions, random).forEach((question) => {
    if (selected.length >= total) return;
    addQuestion(question);
  });

  return selected.slice(0, total);
};

const getOrthographyStorageKey = (userId: string, dateKey: string): string =>
  `${ORTHOGRAPHY_STORAGE_PREFIX}:${userId}:${dateKey}`;

const sanitizeOrthographySession = (
  value: unknown,
  dateKey: string
): OrthographySession | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as {
    date?: unknown;
    questions?: unknown;
    answers?: unknown;
    currentIndex?: unknown;
  };
  if (candidate.date !== dateKey) return null;
  if (!Array.isArray(candidate.questions) || !Array.isArray(candidate.answers)) {
    return null;
  }

  const questions = candidate.questions
    .map((question) => {
      if (!question || typeof question !== 'object') return null;
      const q = question as {
        sourceId?: unknown;
        hitza?: unknown;
        clue?: unknown;
        source?: unknown;
        options?: unknown;
        correctIndex?: unknown;
      };
      if (
        typeof q.sourceId !== 'string' ||
        typeof q.hitza !== 'string' ||
        !Array.isArray(q.options) ||
        q.options.length !== 3 ||
        q.options.some((option) => typeof option !== 'string') ||
        typeof q.correctIndex !== 'number' ||
        q.correctIndex < 0 ||
        q.correctIndex > 2
      ) {
        return null;
      }
      return {
        sourceId: q.sourceId,
        hitza: q.hitza,
        clue:
          typeof q.clue === 'string' && q.clue.trim().length > 0
            ? String(q.clue)
            : 'Aukeratu ondo idatzitako hitza.',
        source:
          q.source === 'dictionary'
            ? 'dictionary'
            : 'synonyms',
        options: q.options as [string, string, string],
        correctIndex: q.correctIndex,
      };
    })
    .filter((question): question is OrthographyQuestion => Boolean(question));

  if (questions.length !== ORTHOGRAPHY_DAILY_TOTAL) return null;
  if (candidate.answers.length !== questions.length) return null;

  const answers = candidate.answers.map((answer) =>
    typeof answer === 'number' && answer >= -1 && answer <= 2
      ? Math.trunc(answer)
      : -1
  );
  const nextIndex = answers.findIndex((answer) => answer === -1);

  return {
    date: dateKey,
    questions,
    answers,
    currentIndex: nextIndex === -1 ? questions.length - 1 : nextIndex,
  };
};

const tabs: Array<{ id: ContributeTab; label: string; icon: JSX.Element }> = [
  { id: 'home', label: 'Hasiera', icon: <HomeIcon /> },
  { id: 'mailak', label: 'Sinonimoak', icon: <CheckIcon /> },
  { id: 'ortografia', label: 'Ortografia', icon: <SpellIcon /> },
  { id: 'txartelak', label: 'Txartelak', icon: <CardsIcon /> },
  { id: 'bilatu', label: 'Bilatu', icon: <SearchIcon /> },
  { id: 'eguneko', label: 'Sailkapena', icon: <CrownIcon /> },
  { id: 'estatistikak', label: 'Estatistikak', icon: <StatsIcon /> },
];

const homeShortcuts: Array<{
  id: Exclude<ContributeTab, 'home'>;
  label: string;
  icon: JSX.Element;
  accentClass: string;
}> = [
  {
    id: 'mailak',
    label: 'Sinonimoak',
    icon: <CheckIcon />,
    accentClass: 'from-cyan-500/15 to-sky-500/15 text-cyan-700',
  },
  {
    id: 'ortografia',
    label: 'Ortografia',
    icon: <SpellIcon />,
    accentClass: 'from-pink-500/15 to-rose-500/15 text-rose-700',
  },
  {
    id: 'txartelak',
    label: 'Txartelak',
    icon: <CardsIcon />,
    accentClass: 'from-emerald-500/15 to-teal-500/15 text-emerald-700',
  },
  {
    id: 'bilatu',
    label: 'Bilatu',
    icon: <SearchIcon />,
    accentClass: 'from-indigo-500/15 to-blue-500/15 text-indigo-700',
  },
  {
    id: 'eguneko',
    label: 'Sailkapena',
    icon: <CrownIcon />,
    accentClass: 'from-amber-400/20 to-orange-500/15 text-amber-700',
  },
  {
    id: 'estatistikak',
    label: 'Estatistikak',
    icon: <StatsIcon />,
    accentClass: 'from-fuchsia-500/15 to-violet-500/15 text-violet-700',
  },
];

const DICTIONARY_FLYOUT_MAX_WIDTH = 360;

type DictionaryFlyoutState = DictionaryMeaning & {
  top: number;
  left: number;
  fallbackUrl?: string;
};

type SearchMode = 'synonyms' | 'meaning';

export const ContributeScreen: React.FC<Props> = ({
  onBack,
  topRightControl,
  userId,
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
  activeChallengeDate,
  dailyRunsByDate,
  difficulty,
  setDifficulty,
  startNewGame,
  searchTerm,
  setSearchTerm,
  isSearching,
  searchResults,
}) => {
  const [flashLevel, setFlashLevel] = useState<DifficultyLevel>(difficulty);
  const [flashDeck, setFlashDeck] = useState<WordData[]>([]);
  const [flashIndex, setFlashIndex] = useState(0);
  const [flashFlipped, setFlashFlipped] = useState(false);
  const [flashLoading, setFlashLoading] = useState(false);
  const [flashError, setFlashError] = useState<string | null>(null);
  const [flashLoadedLevel, setFlashLoadedLevel] = useState<DifficultyLevel | null>(
    null
  );
  const [flashStats, setFlashStats] = useState({ done: 0, knew: 0 });
  const [orthographySession, setOrthographySession] =
    useState<OrthographySession | null>(null);
  const [isOrthographyLoading, setIsOrthographyLoading] = useState(false);
  const [orthographyError, setOrthographyError] = useState<string | null>(null);
  const [dictionaryFlyout, setDictionaryFlyout] = useState<DictionaryFlyoutState | null>(
    null
  );
  const [isMeaningLoading, setIsMeaningLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>('synonyms');
  const [dictionarySearchResult, setDictionarySearchResult] =
    useState<DictionaryMeaning | null>(null);
  const [isDictionarySearchLoading, setIsDictionarySearchLoading] = useState(false);
  const [dictionarySearchFallbackUrl, setDictionarySearchFallbackUrl] = useState<
    string | null
  >(null);
  const [statsDate, setStatsDate] = useState(() => formatLocalDate(new Date()));
  const [statsRows, setStatsRows] = useState<UserAnswerStatRow[]>([]);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const dictionaryFlyoutRef = useRef<HTMLDivElement | null>(null);
  const dictionaryRequestIdRef = useRef(0);
  const dictionarySearchRequestIdRef = useRef(0);
  const statsLoadedUserRef = useRef<string | null>(null);
  const orthographyLoadedKeyRef = useRef<string | null>(null);

  const levelColors: Record<number, string> = {
    1: 'border-sky-200 bg-sky-50 text-sky-700',
    2: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    3: 'border-amber-200 bg-amber-50 text-amber-700',
    4: 'border-rose-200 bg-rose-50 text-rose-700',
  };

  const periodRows =
    competitionPeriod === 'weekly' ? weeklyLeaderboard : monthlyLeaderboard;
  const handleHeaderBack = () => {
    if (activeTab === 'home') {
      onBack();
      return;
    }
    setActiveTab('home');
  };

  const renderRankBadge = (rank: number) => {
    const medal = getRankMedalStyle(rank);
    if (!medal) {
      return (
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
          #{rank}
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${medal.containerClass}`}
      >
        <span
          className={`inline-flex h-4 w-4 items-center justify-center rounded-full ${medal.iconClass}`}
        >
          <MedalIcon />
        </span>
        {medal.label}
      </span>
    );
  };

  const currentFlashCard = flashDeck[flashIndex] ?? null;
  const flashUnknown = Math.max(0, flashStats.done - flashStats.knew);

  const flashAccuracy = useMemo(() => {
    if (flashStats.done === 0) return 0;
    return Math.round((flashStats.knew / flashStats.done) * 100);
  }, [flashStats.done, flashStats.knew]);

  const orthographyCurrentQuestion = orthographySession
    ? orthographySession.questions[orthographySession.currentIndex] ?? null
    : null;

  const orthographySelectedIndex =
    orthographySession && orthographyCurrentQuestion
      ? orthographySession.answers[orthographySession.currentIndex] ?? -1
      : -1;

  const orthographyAnsweredCount = useMemo(() => {
    if (!orthographySession) return 0;
    return orthographySession.answers.filter((answer) => answer >= 0).length;
  }, [orthographySession]);

  const orthographyCorrectCount = useMemo(() => {
    if (!orthographySession) return 0;
    return orthographySession.answers.reduce((total, answer, index) => {
      if (answer < 0) return total;
      return answer === orthographySession.questions[index]?.correctIndex
        ? total + 1
        : total;
    }, 0);
  }, [orthographySession]);

  const orthographyCompleted =
    Boolean(orthographySession) &&
    orthographyAnsweredCount === orthographySession.questions.length;
  const orthographyWrongCount = orthographyAnsweredCount - orthographyCorrectCount;
  const orthographyAccuracy =
    orthographyAnsweredCount > 0
      ? Math.round((orthographyCorrectCount / orthographyAnsweredCount) * 100)
      : 0;

  const loadFlashDeck = useCallback(async (level: DifficultyLevel) => {
    setFlashLoading(true);
    setFlashError(null);
    try {
      const words = await fetchWordsByLevel(level);
      if (!words.length) {
        setFlashDeck([]);
        setFlashError('Ez dago txarteletarako hitzik maila honetan.');
        setFlashLoadedLevel(level);
        return;
      }
      setFlashDeck(shuffle(words));
      setFlashIndex(0);
      setFlashFlipped(false);
      setFlashStats({ done: 0, knew: 0 });
      setFlashLoadedLevel(level);
    } finally {
      setFlashLoading(false);
    }
  }, []);

  useEffect(() => {
    setFlashLevel(difficulty);
  }, [difficulty]);

  useEffect(() => {
    if (activeTab !== 'txartelak') return;
    if (flashLoadedLevel === flashLevel) return;
    void loadFlashDeck(flashLevel);
  }, [activeTab, flashLevel, flashLoadedLevel, loadFlashDeck]);

  useEffect(() => {
    orthographyLoadedKeyRef.current = null;
    setOrthographySession(null);
    setOrthographyError(null);
  }, [userId]);

  useEffect(() => {
    if (activeTab !== 'ortografia') return;
    if (!userId) return;

    const dateKey = formatLocalDate(new Date());
    const storageKey = getOrthographyStorageKey(userId, dateKey);
    if (orthographyLoadedKeyRef.current === storageKey) return;

    let cancelled = false;
    setIsOrthographyLoading(true);
    setOrthographyError(null);

    const loadSession = async () => {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const parsed = sanitizeOrthographySession(JSON.parse(raw), dateKey);
          if (parsed) {
            if (cancelled) return;
            setOrthographySession(parsed);
            orthographyLoadedKeyRef.current = storageKey;
            return;
          }
        }
      } catch {
        // Ignore cache parse failures and regenerate.
      }

      try {
        const words = await fetchOrthographyWordPool();
        if (cancelled) return;

        const questions = buildOrthographyQuestions(
          words,
          dateKey,
          ORTHOGRAPHY_DAILY_TOTAL
        );
        if (questions.length < ORTHOGRAPHY_DAILY_TOTAL) {
          setOrthographySession(null);
          setOrthographyError('Ez dago gaurko ortografia sortzeko adina hitzik.');
          return;
        }

        const freshSession: OrthographySession = {
          date: dateKey,
          questions,
          answers: Array(questions.length).fill(-1),
          currentIndex: 0,
        };
        setOrthographySession(freshSession);
        orthographyLoadedKeyRef.current = storageKey;
      } catch {
        if (cancelled) return;
        setOrthographySession(null);
        setOrthographyError('Ezin izan da ortografia jokoa kargatu.');
      }
    };

    void loadSession().finally(() => {
      if (!cancelled) setIsOrthographyLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeTab, userId]);

  useEffect(() => {
    if (!userId || !orthographySession) return;
    const storageKey = getOrthographyStorageKey(userId, orthographySession.date);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(orthographySession));
      orthographyLoadedKeyRef.current = storageKey;
    } catch {
      // Silent fail: gameplay should continue even if persistence is blocked.
    }
  }, [orthographySession, userId]);

  useEffect(() => {
    if (activeTab !== 'estatistikak') return;
    if (!userId) return;
    if (statsLoadedUserRef.current === userId) return;

    let isCancelled = false;
    setIsStatsLoading(true);
    setStatsError(null);

    void fetchUserAnswerStatsRows(userId)
      .then((rows) => {
        if (isCancelled) return;
        setStatsRows(rows);
        statsLoadedUserRef.current = userId;
      })
      .catch(() => {
        if (isCancelled) return;
        setStatsRows([]);
        setStatsError('Ezin izan dira estatistikak kargatu.');
      })
      .finally(() => {
        if (isCancelled) return;
        setIsStatsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [activeTab, userId]);

  const goNextFlashCard = useCallback(() => {
    if (!flashDeck.length) return;
    if (flashIndex + 1 >= flashDeck.length) {
      setFlashDeck((prev) => shuffle(prev));
      setFlashIndex(0);
    } else {
      setFlashIndex((prev) => prev + 1);
    }
    setFlashFlipped(false);
  }, [flashDeck.length, flashIndex]);

  const handleFlipFlashCard = useCallback(() => {
    if (!currentFlashCard) return;
    setFlashFlipped((previous) => !previous);
  }, [currentFlashCard]);

  const handleEvaluateFlashCard = useCallback((knew: boolean) => {
    if (!currentFlashCard || !flashFlipped) return;
    setFlashStats((prev) => ({
      done: prev.done + 1,
      knew: prev.knew + (knew ? 1 : 0),
    }));
    goNextFlashCard();
  }, [currentFlashCard, flashFlipped, goNextFlashCard]);

  const handleOrthographyOptionSelect = useCallback((optionIndex: number) => {
    setOrthographySession((previous) => {
      if (!previous) return previous;
      const currentQuestion = previous.questions[previous.currentIndex];
      if (!currentQuestion) return previous;
      if (previous.answers[previous.currentIndex] >= 0) return previous;
      if (optionIndex < 0 || optionIndex >= currentQuestion.options.length) {
        return previous;
      }

      const nextAnswers = [...previous.answers];
      nextAnswers[previous.currentIndex] = optionIndex;
      return {
        ...previous,
        answers: nextAnswers,
      };
    });
  }, []);

  const handleOrthographyNext = useCallback(() => {
    setOrthographySession((previous) => {
      if (!previous) return previous;
      if (previous.answers[previous.currentIndex] < 0) return previous;
      if (previous.currentIndex >= previous.questions.length - 1) return previous;
      return {
        ...previous,
        currentIndex: previous.currentIndex + 1,
      };
    });
  }, []);

  const getExternalDictionaryUrl = useCallback(
    (term: string) => `https://hiztegiak.elhuyar.eus/eu/${encodeURIComponent(term)}`,
    []
  );

  const openExternalDictionary = useCallback(
    (term: string): boolean => {
      const openedWindow = window.open(
        getExternalDictionaryUrl(term),
        '_blank',
        'noopener,noreferrer'
      );
      return Boolean(openedWindow);
    },
    [getExternalDictionaryUrl]
  );

  useEffect(() => {
    if (searchMode === 'synonyms') return;
    setDictionaryFlyout(null);
  }, [searchMode]);

  useEffect(() => {
    if (activeTab !== 'bilatu' || searchMode !== 'meaning') {
      dictionarySearchRequestIdRef.current += 1;
      setDictionarySearchResult(null);
      setDictionarySearchFallbackUrl(null);
      setIsDictionarySearchLoading(false);
      return;
    }

    const normalized = searchTerm.trim();
    if (normalized.length < 2) {
      dictionarySearchRequestIdRef.current += 1;
      setDictionarySearchResult(null);
      setDictionarySearchFallbackUrl(null);
      setIsDictionarySearchLoading(false);
      return;
    }

    const requestId = ++dictionarySearchRequestIdRef.current;
    const timer = setTimeout(async () => {
      setIsDictionarySearchLoading(true);
      try {
        const meaning = await lookupDictionaryMeaning(normalized);
        if (requestId !== dictionarySearchRequestIdRef.current) return;

        if (meaning) {
          setDictionarySearchResult(meaning);
          setDictionarySearchFallbackUrl(null);
          return;
        }

        setDictionarySearchResult(null);
        setDictionarySearchFallbackUrl(getExternalDictionaryUrl(normalized));
      } catch {
        if (requestId !== dictionarySearchRequestIdRef.current) return;
        setDictionarySearchResult(null);
        setDictionarySearchFallbackUrl(getExternalDictionaryUrl(normalized));
      } finally {
        if (requestId !== dictionarySearchRequestIdRef.current) return;
        setIsDictionarySearchLoading(false);
      }
    }, 360);

    return () => {
      clearTimeout(timer);
    };
  }, [activeTab, getExternalDictionaryUrl, searchMode, searchTerm]);

  const handleMeaningLookup = useCallback(
    async (term: string, event: React.MouseEvent<HTMLElement>) => {
      const normalized = term.trim();
      if (!normalized) return;

      const targetRect = event.currentTarget.getBoundingClientRect();
      const flyoutWidth = Math.min(
        DICTIONARY_FLYOUT_MAX_WIDTH,
        Math.max(220, window.innerWidth - 24)
      );
      const left = Math.min(
        window.innerWidth - flyoutWidth - 12,
        Math.max(12, targetRect.left)
      );
      const top = Math.min(
        window.innerHeight - 150,
        Math.max(12, targetRect.bottom + 10)
      );

      const requestId = ++dictionaryRequestIdRef.current;
      setDictionaryFlyout({ hitza: normalized, esanahia: '', top, left });
      setIsMeaningLoading(true);

      try {
        const meaning = await lookupDictionaryMeaning(normalized);
        if (requestId !== dictionaryRequestIdRef.current) return;

        if (meaning) {
          setDictionaryFlyout({ ...meaning, top, left, fallbackUrl: undefined });
          return;
        }

        const opened = openExternalDictionary(normalized);
        if (opened) {
          setDictionaryFlyout(null);
        } else {
          setDictionaryFlyout({
            hitza: normalized,
            esanahia: 'Ez da aurkitu tokiko hiztegian.',
            top,
            left,
            fallbackUrl: getExternalDictionaryUrl(normalized),
          });
        }
      } catch {
        if (requestId !== dictionaryRequestIdRef.current) return;
        const opened = openExternalDictionary(normalized);
        if (opened) {
          setDictionaryFlyout(null);
        } else {
          setDictionaryFlyout({
            hitza: normalized,
            esanahia: 'Ezin izan da tokiko hiztegia kontsultatu.',
            top,
            left,
            fallbackUrl: getExternalDictionaryUrl(normalized),
          });
        }
      } finally {
        if (requestId !== dictionaryRequestIdRef.current) return;
        setIsMeaningLoading(false);
      }
    },
    [getExternalDictionaryUrl, openExternalDictionary]
  );

  useEffect(() => {
    if (activeTab === 'bilatu') return;
    dictionaryRequestIdRef.current += 1;
    setIsMeaningLoading(false);
    setDictionaryFlyout(null);
  }, [activeTab]);

  const hasTimestampData = useMemo(
    () => statsRows.some((row) => Boolean(row.event_at)),
    [statsRows]
  );

  const seenCountsByDate = useMemo(() => {
    const byDate = new Map<string, number>();
    if (!hasTimestampData) return byDate;

    statsRows.forEach((row) => {
      if (!row.event_at) return;
      const dayKey = formatLocalDate(new Date(row.event_at));
      byDate.set(dayKey, (byDate.get(dayKey) ?? 0) + 1);
    });
    return byDate;
  }, [hasTimestampData, statsRows]);

  const weeklySeenBars = useMemo(() => {
    const today = new Date();
    const points: Array<{ key: string; label: string; count: number }> = [];

    for (let offset = 6; offset >= 0; offset -= 1) {
      const current = new Date(today);
      current.setHours(0, 0, 0, 0);
      current.setDate(today.getDate() - offset);
      const dayKey = formatLocalDate(current);
      points.push({
        key: dayKey,
        label: formatWeekdayShort(current),
        count: seenCountsByDate.get(dayKey) ?? 0,
      });
    }

    return points;
  }, [seenCountsByDate]);

  const monthlySeenBars = useMemo(() => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const points: Array<{ key: string; label: string; count: number }> = [];
    const totalDays = today.getDate();

    for (let dayNumber = 1; dayNumber <= totalDays; dayNumber += 1) {
      const current = new Date(monthStart);
      current.setDate(dayNumber);
      const dayKey = formatLocalDate(current);
      points.push({
        key: dayKey,
        label: String(dayNumber),
        count: seenCountsByDate.get(dayKey) ?? 0,
      });
    }

    return points;
  }, [seenCountsByDate]);

  const weeklySeenMax = useMemo(
    () => Math.max(1, ...weeklySeenBars.map((point) => point.count)),
    [weeklySeenBars]
  );

  const monthlySeenMax = useMemo(
    () => Math.max(1, ...monthlySeenBars.map((point) => point.count)),
    [monthlySeenBars]
  );

  const weeklySeenTotal = useMemo(
    () => weeklySeenBars.reduce((total, point) => total + point.count, 0),
    [weeklySeenBars]
  );

  const monthlySeenTotal = useMemo(
    () => monthlySeenBars.reduce((total, point) => total + point.count, 0),
    [monthlySeenBars]
  );

  const rowsForSelectedDate = useMemo(() => {
    if (!hasTimestampData) return statsRows;
    return statsRows.filter((row) => {
      if (!row.event_at) return false;
      return formatLocalDate(new Date(row.event_at)) === statsDate;
    });
  }, [hasTimestampData, statsDate, statsRows]);

  const levelSummaries = useMemo(() => {
    const summaryByLevel = new Map<
      DifficultyLevel,
      { attempts: number; correct: number; wrong: number }
    >();

    ([1, 2, 3, 4] as DifficultyLevel[]).forEach((level) => {
      summaryByLevel.set(level, { attempts: 0, correct: 0, wrong: 0 });
    });

    rowsForSelectedDate.forEach((row) => {
      const level = row.level as DifficultyLevel;
      const entry = summaryByLevel.get(level) ?? { attempts: 0, correct: 0, wrong: 0 };
      entry.attempts += 1;
      if (row.is_correct) entry.correct += 1;
      else entry.wrong += 1;
      summaryByLevel.set(level, entry);
    });

    return ([1, 2, 3, 4] as DifficultyLevel[]).map((level) => {
      const entry = summaryByLevel.get(level) ?? { attempts: 0, correct: 0, wrong: 0 };
      const accuracy = entry.attempts > 0 ? Math.round((entry.correct / entry.attempts) * 100) : 0;
      return { level, ...entry, accuracy };
    });
  }, [rowsForSelectedDate]);

  const totalSummaryForSelectedDate = useMemo(() => {
    const attempts = rowsForSelectedDate.length;
    const correct = rowsForSelectedDate.filter((row) => row.is_correct).length;
    const wrong = attempts - correct;
    const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;
    return { attempts, correct, wrong, accuracy };
  }, [rowsForSelectedDate]);

  const wordStatsByLevel = useMemo(() => {
    const byWord = new Map<
      string,
      {
        sourceId: string;
        hitza: string;
        level: DifficultyLevel;
        attempts: number;
        correct: number;
        wrong: number;
      }
    >();

    rowsForSelectedDate.forEach((row) => {
      const level = row.level as DifficultyLevel;
      const sourceId = String(row.source_id);
      const key = `${level}::${sourceId}`;
      const current = byWord.get(key) ?? {
        sourceId,
        hitza: row.hitza,
        level,
        attempts: 0,
        correct: 0,
        wrong: 0,
      };
      current.attempts += 1;
      if (row.is_correct) current.correct += 1;
      else current.wrong += 1;
      byWord.set(key, current);
    });

    return ([1, 2, 3, 4] as DifficultyLevel[]).map((level) => {
      const rows = Array.from(byWord.values())
        .filter(
          (entry) => entry.level === level && entry.attempts >= 3 && entry.wrong >= 3
        )
        .sort((a, b) => {
          if (b.wrong !== a.wrong) return b.wrong - a.wrong;
          if (b.attempts !== a.attempts) return b.attempts - a.attempts;
          return a.hitza.localeCompare(b.hitza);
        })
        .map((entry) => ({
          ...entry,
          accuracy:
            entry.attempts > 0 ? Math.round((entry.correct / entry.attempts) * 100) : 0,
        }));

      return { level, rows };
    });
  }, [rowsForSelectedDate]);

  const highlightedWordStatsByLevel = useMemo(
    () => wordStatsByLevel.filter((group) => group.rows.length > 0),
    [wordStatsByLevel]
  );

  const highlightedWordCount = useMemo(
    () =>
      highlightedWordStatsByLevel.reduce(
        (total, group) => total + group.rows.length,
        0
      ),
    [highlightedWordStatsByLevel]
  );

  const failedMoreThanThreeRows = useMemo(() => {
    const byWord = new Map<
      string,
      {
        sourceId: string;
        hitza: string;
        level: DifficultyLevel;
        attempts: number;
        correct: number;
        wrong: number;
      }
    >();

    statsRows.forEach((row) => {
      const level = row.level as DifficultyLevel;
      const sourceId = String(row.source_id);
      const key = `${level}::${sourceId}`;
      const current = byWord.get(key) ?? {
        sourceId,
        hitza: row.hitza,
        level,
        attempts: 0,
        correct: 0,
        wrong: 0,
      };
      current.attempts += 1;
      if (row.is_correct) current.correct += 1;
      else current.wrong += 1;
      byWord.set(key, current);
    });

    return Array.from(byWord.values())
      .filter((entry) => entry.wrong >= 3)
      .sort((a, b) => {
        if (b.wrong !== a.wrong) return b.wrong - a.wrong;
        if (b.attempts !== a.attempts) return b.attempts - a.attempts;
        return a.hitza.localeCompare(b.hitza);
      })
      .map((entry) => ({
        ...entry,
        accuracy:
          entry.attempts > 0 ? Math.round((entry.correct / entry.attempts) * 100) : 0,
      }));
  }, [statsRows]);

  useEffect(() => {
    if (!dictionaryFlyout) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if (!dictionaryFlyoutRef.current || !(target instanceof Node)) return;
      if (dictionaryFlyoutRef.current.contains(target)) return;
      setDictionaryFlyout(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setDictionaryFlyout(null);
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [dictionaryFlyout]);

  return (
    <AppShell
      topRightControl={topRightControl}
      header={
        <div className="flex w-full items-center justify-between gap-3">
          <button
            onClick={handleHeaderBack}
            className="btn-ghost inline-flex min-w-[5.25rem] items-center justify-start"
          >
            {activeTab === 'home' ? 'Erronka' : 'Atzera'}
          </button>
          <div className="text-center">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Menua
            </h2>
          </div>
          <div className="w-[5.25rem]" />
        </div>
      }
      footer={
        <nav
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-label={tab.label}
                className={
                  'group rounded-2xl border px-2 py-2.5 transition duration-200 ' +
                  (isActive
                    ? 'border-teal-300 bg-gradient-to-br from-teal-50 to-cyan-50 text-teal-700 shadow-[0_10px_18px_-14px_rgba(13,148,136,0.8)]'
                    : 'border-slate-200/70 bg-white/80 text-slate-400 hover:border-slate-300 hover:text-slate-700')
                }
              >
                <div
                  className={
                    'mx-auto flex h-7 w-7 items-center justify-center rounded-xl transition ' +
                    (isActive
                      ? 'bg-teal-100/80'
                      : 'bg-slate-100/70 group-hover:bg-slate-200/70')
                  }
                >
                  {tab.icon}
                </div>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] max-[900px]:hidden">
                  {tab.label}
                </p>
              </button>
            );
          })}
        </nav>
      }
    >
      {activeTab === 'home' && (
        <div className="space-y-4">
          <section className="surface-card surface-card--accent p-4 md:p-5">
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <h3 className="font-display text-2xl font-semibold text-cyan-50 md:text-3xl">
                Gaurko partida
              </h3>
              <button
                onClick={startDailyCompetition}
                disabled={isLoadingWords || hasPlayedToday}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-extrabold uppercase tracking-[0.09em] text-teal-800 shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
              >
                <DailyIcon />
                {isLoadingWords
                  ? 'Kargatzen...'
                  : hasPlayedToday
                    ? 'Jokatuta'
                    : 'Hasi'}
              </button>
            </div>
          </section>

          <section className="surface-card p-4">
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {homeShortcuts.map((shortcut) => (
                <button
                  key={shortcut.id}
                  onClick={() => setActiveTab(shortcut.id)}
                  className={
                    'group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_24px_-18px_rgba(15,23,42,0.6)] sm:px-4 sm:py-3'
                  }
                >
                  <span
                    className={
                      `pointer-events-none absolute inset-0 bg-gradient-to-br ${shortcut.accentClass} opacity-80 transition group-hover:opacity-100`
                    }
                  />
                  <span className="relative flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/90 text-slate-700 shadow-sm">
                      {shortcut.icon}
                    </span>
                    <p className="font-display text-2xl font-semibold text-slate-800 sm:text-xl">
                      {shortcut.label}
                    </p>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="surface-card p-4 md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-2xl font-semibold text-slate-900">
                Gaurko sailkapena
              </h3>
              <button
                onClick={() => setActiveTab('eguneko')}
                className="btn-ghost !p-0 text-xs uppercase"
              >
                Ikusi dena
              </button>
            </div>

            {isLoadingCompetition ? (
              <p className="text-sm font-semibold text-slate-500">Kargatzen...</p>
            ) : competitionError ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">
                {competitionError}
              </p>
            ) : dailyLeaderboard.length === 0 ? (
              <p className="text-sm text-slate-500">Oraindik ez dago emaitzarik gaur.</p>
            ) : (
              <div className="grid gap-2">
                {dailyLeaderboard.slice(0, 5).map((entry, index) => (
                  <div
                    key={entry.id}
                    className={
                      'flex items-center justify-between rounded-xl border px-3 py-2 ' +
                      (index === 0
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-slate-200 bg-white')
                    }
                  >
                    <div className="flex items-center gap-2">
                      {renderRankBadge(entry.rank)}
                      <span className="font-semibold text-slate-800">
                        {entry.player_name}
                      </span>
                    </div>
                    <p className="font-display text-2xl font-semibold text-teal-700">
                      {entry.score}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'mailak' && (
        <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
          <section className="surface-card surface-card--muted p-4 md:p-5">
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[1, 2, 3, 4].map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level as DifficultyLevel)}
                  className={
                    'rounded-xl border px-3 py-3 text-sm font-bold transition ' +
                    (difficulty === level
                      ? 'border-teal-600 bg-teal-600 text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')
                  }
                >
                  L{level}
                </button>
              ))}
            </div>

            <button
              onClick={() => startNewGame(true)}
              disabled={isLoadingWords}
              className="btn-primary mt-5 w-full py-3.5"
            >
              {isLoadingWords ? 'Kargatzen...' : 'Bakarka jolastu'}
            </button>
          </section>

          <section className="surface-card p-5">
            <p className="font-display mt-2 text-5xl font-semibold text-slate-900">
              L{difficulty}
            </p>
          </section>
        </div>
      )}

      {activeTab === 'ortografia' && (
        <div className="space-y-4">
          <section className="surface-card p-4">
            <div className="grid gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                  Gaurkoak
                </p>
                <p className="text-2xl font-semibold text-slate-800">
                  {orthographyAnsweredCount}/{ORTHOGRAPHY_DAILY_TOTAL}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-700">
                  Asmatuak
                </p>
                <p className="text-2xl font-semibold text-emerald-700">
                  {orthographyCorrectCount}
                </p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-rose-700">
                  Hutsak
                </p>
                <p className="text-2xl font-semibold text-rose-700">
                  {orthographyWrongCount}
                </p>
              </div>
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-cyan-700">
                  Zehaztasuna
                </p>
                <p className="text-2xl font-semibold text-cyan-700">
                  {orthographyAccuracy}%
                </p>
              </div>
            </div>
          </section>

          <section className="surface-card surface-card--muted p-4 md:p-5">
            {isOrthographyLoading ? (
              <p className="text-sm font-semibold text-slate-500">
                Ortografia jokoa kargatzen...
              </p>
            ) : orthographyError ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">
                {orthographyError}
              </p>
            ) : !orthographySession || !orthographyCurrentQuestion ? (
              <p className="text-sm text-slate-500">
                Ezin izan da gaurko ortografia saioa prestatu.
              </p>
            ) : orthographyCompleted ? (
              <div className="space-y-4 text-center">
                <p className="font-display text-3xl font-semibold text-slate-900">
                  Gaurko ortografia amaituta
                </p>
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">
                  {orthographyCorrectCount}/{ORTHOGRAPHY_DAILY_TOTAL} zuzen
                </p>
                <p className="text-sm text-slate-600">
                  Bihar beste 10 hitz berri izango dituzu.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                    {orthographySession.currentIndex + 1} / {orthographySession.questions.length}
                  </p>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                    Ortografia
                  </span>
                </div>

                <div className="grid gap-2">
                  {orthographyCurrentQuestion.options.map((option, optionIndex) => {
                    const isAnswered = orthographySelectedIndex >= 0;
                    const isCorrect = optionIndex === orthographyCurrentQuestion.correctIndex;
                    const isSelected = optionIndex === orthographySelectedIndex;
                    const stateClass = !isAnswered
                      ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      : isCorrect
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : isSelected
                          ? 'border-rose-300 bg-rose-50 text-rose-700'
                          : 'border-slate-200 bg-slate-50 text-slate-500';

                    return (
                      <button
                        key={`${orthographyCurrentQuestion.sourceId}-${optionIndex}`}
                        type="button"
                        onClick={() => handleOrthographyOptionSelect(optionIndex)}
                        disabled={isAnswered}
                        className={`rounded-2xl border px-4 py-3 text-left text-lg font-semibold transition ${stateClass}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                {orthographySelectedIndex >= 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p
                      className={
                        'text-sm font-semibold ' +
                        (orthographySelectedIndex ===
                        orthographyCurrentQuestion.correctIndex
                          ? 'text-emerald-700'
                          : 'text-rose-700')
                      }
                    >
                      {orthographySelectedIndex ===
                      orthographyCurrentQuestion.correctIndex
                        ? 'Zuzena.'
                        : `Okerra. Zuzena: ${orthographyCurrentQuestion.options[orthographyCurrentQuestion.correctIndex]}.`}
                    </p>
                    <button
                      type="button"
                      onClick={handleOrthographyNext}
                      className="btn-primary !px-4 !py-2.5"
                    >
                      Hurrengoa
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'txartelak' && (
        <div className="space-y-4">
          <section className="surface-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              {[1, 2, 3, 4].map((level) => (
                <button
                  key={level}
                  onClick={() => setFlashLevel(level as DifficultyLevel)}
                  className={
                    'rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] transition ' +
                    (flashLevel === level
                      ? 'border-teal-500 bg-teal-500 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')
                  }
                >
                  L{level}
                </button>
              ))}
              <button
                onClick={() => void loadFlashDeck(flashLevel)}
                className="btn-secondary !px-3 !py-2 !text-xs"
              >
                Sorta berritu
              </button>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Egindakoak</p>
                <p className="text-2xl font-semibold text-slate-800">
                  {flashStats.done}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-700">Banekien</p>
                <p className="text-2xl font-semibold text-emerald-700">
                  {flashStats.knew}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Ez nekien</p>
                <p className="text-2xl font-semibold text-slate-800">
                  {flashUnknown}
                </p>
              </div>
            </div>
          </section>

          <section className="surface-card surface-card--muted p-4 md:p-5">
            {flashLoading ? (
              <p className="text-sm font-semibold text-slate-500">Txartelak kargatzen...</p>
            ) : flashError ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">
                {flashError}
              </p>
            ) : !currentFlashCard ? (
              <p className="text-sm text-slate-500">Ez dago txartelik erakusteko.</p>
            ) : (
              <div className="space-y-4">
                <div className="anki-card-scene">
                  <button
                    type="button"
                    onClick={handleFlipFlashCard}
                    className={`anki-card ${flashFlipped ? 'is-flipped' : ''}`}
                  >
                    <span className="anki-card-face anki-card-face--front">
                      <p className="font-display break-words text-4xl font-semibold text-slate-900 md:text-5xl">
                        {currentFlashCard.hitza}
                      </p>
                      <p className="mt-3 text-[11px] font-semibold text-slate-500">
                        {flashIndex + 1} / {flashDeck.length}
                      </p>
                    </span>

                    <span className="anki-card-face anki-card-face--back">
                      <div className="flex flex-wrap justify-center gap-2">
                        {currentFlashCard.sinonimoak.length > 0 ? (
                          currentFlashCard.sinonimoak.map((synonym, idx) => (
                            <span
                              key={`${synonym}-${idx}`}
                              className="rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-base font-bold text-teal-700 md:text-lg"
                            >
                              {synonym}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">
                            Ez dago sinonimorik.
                          </span>
                        )}
                      </div>
                    </span>
                  </button>
                </div>

                {!flashFlipped ? (
                  <div />
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      onClick={() => handleEvaluateFlashCard(false)}
                      className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold uppercase tracking-[0.08em] text-rose-700 transition hover:border-rose-300"
                    >
                      Ez nekien
                    </button>
                    <button
                      onClick={() => handleEvaluateFlashCard(true)}
                      className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold uppercase tracking-[0.08em] text-emerald-700 transition hover:border-emerald-300"
                    >
                      Banekien
                    </button>
                  </div>
                )}

                <p className="text-center text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Ezagutza tasa: {flashAccuracy}%
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'bilatu' && (
        <div className="space-y-4">
          <section className="surface-card p-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
              Bilaketa
            </label>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSearchMode('synonyms')}
                className={
                  'rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] transition ' +
                  (searchMode === 'synonyms'
                    ? 'border-teal-500 bg-teal-500 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')
                }
              >
                Sinonimoak
              </button>
              <button
                type="button"
                onClick={() => setSearchMode('meaning')}
                className={
                  'rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] transition ' +
                  (searchMode === 'meaning'
                    ? 'border-teal-500 bg-teal-500 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')
                }
              >
                Esanahia
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder={
                  searchMode === 'synonyms'
                    ? 'Idatzi hitza edo sinonimoa...'
                    : 'Idatzi hitza...'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-shell !py-3 !pl-11 !pr-10"
              />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon />
              </span>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.7 7.3a1 1 0 00-1.4 1.4L8.6 10l-1.3 1.3a1 1 0 101.4 1.4L10 11.4l1.3 1.3a1 1 0 001.4-1.4L11.4 10l1.3-1.3a1 1 0 10-1.4-1.4L10 8.6 8.7 7.3z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
          </section>

          {searchMode === 'synonyms' ? (
            <>
              {isSearching ? (
                <p className="text-sm font-semibold text-slate-500">Bilatzen...</p>
              ) : searchResults.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {searchTerm.length < 2
                    ? 'Idatzi gutxienez 2 letra bilatzeko.'
                    : 'Ez da emaitzarik aurkitu.'}
                </p>
              ) : (
                <div className="grid gap-3">
                  {searchResults.map((word, index) => (
                    <article key={`${word.id}-${index}`} className="surface-card p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            void handleMeaningLookup(word.hitza, event);
                          }}
                          className="border-0 bg-transparent p-0 font-display text-left text-2xl font-semibold text-slate-900 transition hover:text-teal-700"
                        >
                          {word.hitza}
                        </button>
                        <span
                          className={
                            'rounded-full border px-3 py-1 text-xs font-bold uppercase ' +
                            (levelColors[word.level] ||
                              'border-slate-200 bg-slate-50 text-slate-600')
                          }
                        >
                          L{word.level}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {word.sinonimoak.map((synonym, synonymIndex) => (
                          <button
                            type="button"
                            key={`${synonym}-${synonymIndex}`}
                            onClick={(event) => {
                              void handleMeaningLookup(synonym, event);
                            }}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:text-teal-700"
                          >
                            {synonym}
                          </button>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {dictionaryFlyout ? (
                <div
                  ref={dictionaryFlyoutRef}
                  className="dictionary-flyout"
                  style={{ top: `${dictionaryFlyout.top}px`, left: `${dictionaryFlyout.left}px` }}
                  role="dialog"
                  aria-label={`${dictionaryFlyout.hitza} esanahia`}
                >
                  <div className="dictionary-flyout__header">
                    <p className="font-display text-lg font-semibold text-slate-900">
                      {dictionaryFlyout.hitza}
                    </p>
                    <button
                      type="button"
                      onClick={() => setDictionaryFlyout(null)}
                      className="dictionary-flyout__close"
                      aria-label="Itxi"
                    >
                      X
                    </button>
                  </div>
                  <p className="dictionary-flyout__body">
                    {isMeaningLoading ? 'Esanahia bilatzen...' : dictionaryFlyout.esanahia}
                  </p>
                  {!isMeaningLoading && dictionaryFlyout.fallbackUrl ? (
                    <a
                      href={dictionaryFlyout.fallbackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dictionary-flyout__link"
                    >
                      Ireki Elhuyar-en
                    </a>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : searchTerm.trim().length < 2 ? (
            <p className="text-sm text-slate-500">
              Idatzi gutxienez 2 letra esanahia bilatzeko.
            </p>
          ) : isDictionarySearchLoading ? (
            <p className="text-sm font-semibold text-slate-500">Esanahia bilatzen...</p>
          ) : dictionarySearchResult ? (
            <article className="surface-card p-4 md:p-5">
              <h3 className="font-display text-3xl font-semibold text-slate-900">
                {dictionarySearchResult.hitza}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700 md:text-lg">
                {dictionarySearchResult.esanahia}
              </p>
            </article>
          ) : (
            <article className="surface-card surface-card--muted p-4 md:p-5">
              <p className="text-sm font-semibold text-slate-600">
                Ez da esanahirik aurkitu tokiko hiztegian.
              </p>
              {dictionarySearchFallbackUrl ? (
                <a
                  href={dictionarySearchFallbackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dictionary-flyout__link mt-3"
                >
                  Ireki Elhuyar-en
                </a>
              ) : null}
            </article>
          )}
        </div>
      )}

      {activeTab === 'estatistikak' && (
        <div className="space-y-5">
          <section className="surface-card p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Data
                </p>
                <p className="font-display text-2xl font-semibold text-slate-900">
                  {statsDate}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={statsDate}
                  max={formatLocalDate(new Date())}
                  onChange={(event) => setStatsDate(event.target.value)}
                  className="input-shell !w-auto !py-2 !text-sm"
                />
                <button
                  type="button"
                  onClick={() => setStatsDate(formatLocalDate(new Date()))}
                  className="btn-secondary !py-2 !text-xs"
                >
                  Gaur
                </button>
              </div>
            </div>
            {!hasTimestampData && statsRows.length > 0 ? (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                Erantzunen datarik ez dago; estatistikak historial osoarekin kalkulatu dira.
              </p>
            ) : null}
          </section>

          {isStatsLoading ? (
            <p className="text-sm font-semibold text-slate-500">Estatistikak kargatzen...</p>
          ) : statsError ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">
              {statsError}
            </p>
          ) : (
            <>
              <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <article className="surface-card surface-card--accent p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-cyan-100">
                    Guztira ({statsDate})
                  </p>
                  <p className="mt-2 font-display text-4xl font-semibold text-white">
                    {totalSummaryForSelectedDate.accuracy}%
                  </p>
                  <p className="mt-1 text-sm text-cyan-50">
                    {totalSummaryForSelectedDate.correct} / {totalSummaryForSelectedDate.attempts} zuzen
                  </p>
                </article>
                {levelSummaries.map((levelSummary) => (
                  <article key={levelSummary.level} className="surface-card p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                        L{levelSummary.level}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600">
                        {levelSummary.attempts} saiakera
                      </span>
                    </div>
                    <p className="mt-2 font-display text-3xl font-semibold text-slate-900">
                      {levelSummary.accuracy}%
                    </p>
                    <p className="mt-1 text-xs font-semibold text-emerald-700">
                      Asmatuak: {levelSummary.correct}
                    </p>
                    <p className="text-xs font-semibold text-rose-700">
                      Hutsak: {levelSummary.wrong}
                    </p>
                  </article>
                ))}
              </section>

              <section className="grid gap-3 xl:grid-cols-2">
                <article className="surface-card p-4 md:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-2xl font-semibold text-slate-900">
                      Asterokoa
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-600">
                      {weeklySeenTotal} hitz
                    </span>
                  </div>
                  {!hasTimestampData ? (
                    <p className="mt-3 text-sm text-slate-500">
                      Datarik gabe ezin da grafikoa erakutsi.
                    </p>
                  ) : (
                    <div className="mt-4 grid h-44 grid-cols-7 items-end gap-2">
                      {weeklySeenBars.map((point) => {
                        const ratio =
                          weeklySeenMax > 0 ? point.count / weeklySeenMax : 0;
                        const heightPercent =
                          point.count === 0 ? 10 : Math.max(14, ratio * 100);

                        return (
                          <div key={`weekly-${point.key}`} className="flex flex-col items-center gap-1">
                            <div className="flex h-36 w-full items-end">
                              <div
                                className="w-full rounded-t-lg bg-gradient-to-t from-teal-500 to-cyan-400"
                                style={{ height: `${heightPercent}%` }}
                                title={`${point.label}: ${point.count}`}
                              />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">
                              {point.label}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-600">
                              {point.count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>

                <article className="surface-card p-4 md:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-2xl font-semibold text-slate-900">
                      Hilabetekoa
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-600">
                      {monthlySeenTotal} hitz
                    </span>
                  </div>
                  {!hasTimestampData ? (
                    <p className="mt-3 text-sm text-slate-500">
                      Datarik gabe ezin da grafikoa erakutsi.
                    </p>
                  ) : (
                    <div
                      className="mt-4 grid h-44 items-end gap-1"
                      style={{
                        gridTemplateColumns:
                          monthlySeenBars.length > 0
                            ? `repeat(${monthlySeenBars.length}, minmax(0, 1fr))`
                            : undefined,
                      }}
                    >
                      {monthlySeenBars.map((point, index) => {
                          const labelStep =
                            monthlySeenBars.length > 14
                              ? Math.ceil(monthlySeenBars.length / 14)
                              : 1;
                          const shouldShowLabel =
                            index === monthlySeenBars.length - 1 ||
                            index % labelStep === 0;
                          const ratio =
                            monthlySeenMax > 0 ? point.count / monthlySeenMax : 0;
                          const heightPercent =
                            point.count === 0 ? 8 : Math.max(12, ratio * 100);

                          return (
                            <div
                              key={`monthly-${point.key}`}
                              className="flex min-w-0 flex-col items-center gap-1"
                            >
                              <div className="flex h-36 w-full items-end">
                                <div
                                  className="w-full rounded-t-md bg-gradient-to-t from-indigo-500 to-violet-400"
                                  style={{ height: `${heightPercent}%` }}
                                  title={`${point.key}: ${point.count}`}
                                />
                              </div>
                              {shouldShowLabel ? (
                                <span className="truncate text-[9px] font-semibold text-slate-500">
                                  {point.label}
                                </span>
                              ) : (
                                <span className="text-[9px] text-transparent select-none">
                                  .
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </article>
              </section>

              <section className="surface-card p-4 md:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display text-2xl font-semibold text-slate-900">
                    Eguneko hitzak mailaka
                  </h3>
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                    Asmatu/Huts eta %
                  </p>
                </div>

                {rowsForSelectedDate.length === 0 ? (
                  <p className="text-sm text-slate-500">Ez dago saiakerarik data honetan.</p>
                ) : highlightedWordCount === 0 ? (
                  <p className="text-sm text-slate-500">
                    Data honetan ez dago gutxienez 3 saiakera eta 3 huts dituzten hitzik.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {highlightedWordStatsByLevel.map((levelGroup) => (
                      <article key={levelGroup.level} className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="font-display text-xl font-semibold text-slate-900">
                            L{levelGroup.level}
                          </p>
                          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                            {levelGroup.rows.length} hitz
                          </span>
                        </div>
                        <div className="space-y-2">
                          {levelGroup.rows.map((row) => (
                            <div
                              key={`${row.level}-${row.sourceId}`}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                            >
                              <p className="font-semibold text-slate-800">{row.hitza}</p>
                              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700">
                                  {row.attempts} saiakera
                                </span>
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                                  +{row.correct}
                                </span>
                                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-700">
                                  -{row.wrong}
                                </span>
                                <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-cyan-700">
                                  {row.accuracy}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="surface-card p-4 md:p-5">
                <h3 className="font-display text-2xl font-semibold text-slate-900">
                  Gutxienez 3 huts dituzten hitzak
                </h3>
                {failedMoreThanThreeRows.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">
                    Oraingoz ez dago gutxienez 3 huts dituen hitzik.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-2">
                    {failedMoreThanThreeRows.map((row) => (
                      <div
                        key={`failed-${row.level}-${row.sourceId}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">
                            {row.hitza} <span className="text-xs text-slate-500">(L{row.level})</span>
                          </p>
                          <p className="text-xs text-slate-500">
                            {row.attempts} saiakera - {row.accuracy}% asmatze
                          </p>
                        </div>
                        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">
                          {row.wrong} huts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}

      {activeTab === 'eguneko' && (
        <div className="space-y-5">
          <section className="surface-card p-4 md:p-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {(['daily', 'weekly', 'monthly'] as LeaderboardPeriod[]).map(
                (period) => (
                  <button
                    key={period}
                    onClick={() => setCompetitionPeriod(period)}
                    className={
                      'rounded-xl border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] transition ' +
                      (competitionPeriod === period
                        ? 'border-teal-500 bg-teal-500 text-white'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300')
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
              <p className="text-sm font-semibold text-slate-500">Kargatzen...</p>
            ) : competitionError ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">
                {competitionError}
              </p>
            ) : competitionPeriod === 'daily' ? (
              dailyLeaderboard.length === 0 ? (
                <p className="text-sm text-slate-500">Oraindik ez dago emaitzarik gaur.</p>
              ) : (
                <div className="grid gap-2">
                  {dailyLeaderboard.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {renderRankBadge(entry.rank)}
                          <p className="text-sm font-semibold text-slate-800">
                            {entry.player_name}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500">
                          {entry.correct}/{entry.total} - {entry.time_seconds.toFixed(1)}s
                        </p>
                      </div>
                      <p className="font-display text-2xl font-semibold text-teal-700">
                        {entry.score}
                      </p>
                    </div>
                  ))}
                </div>
              )
            ) : periodRows.length === 0 ? (
              <p className="text-sm text-slate-500">Oraindik ez dago emaitzarik.</p>
            ) : (
              <div className="grid gap-2">
                {periodRows.map((entry) => (
                  <div
                    key={entry.user_id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {renderRankBadge(entry.rank)}
                        <p className="text-sm font-semibold text-slate-800">
                          {entry.player_name}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">
                        {entry.games_played} partida - {entry.total_correct}/
                        {entry.total_questions}
                      </p>
                    </div>
                    <p className="font-display text-2xl font-semibold text-teal-700">
                      {entry.total_score}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="surface-card p-4 md:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold uppercase tracking-[0.08em] text-slate-500">
                Partidak eta erantzunak
              </p>
              <input
                type="date"
                value={competitionDate}
                max={activeChallengeDate}
                onChange={(e) => setCompetitionDate(e.target.value)}
                className="input-shell !w-auto !py-2 !text-sm"
              />
            </div>

            {dailyRunsByDate.length === 0 ? (
              <p className="text-sm text-slate-500">
                Egun honetarako ez dago partidarik.
              </p>
            ) : (
              <div className="space-y-2">
                {dailyRunsByDate.map((run) => (
                  <details
                    key={run.id}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {run.player_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {run.correct}/{run.total} - {run.time_seconds.toFixed(1)}s
                        </p>
                      </div>
                      <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-700">
                        {run.score} p
                      </span>
                    </summary>
                    <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
                      {run.answers.map((answer) => (
                        <div
                          key={`${run.id}-${answer.question_index}`}
                          className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600"
                        >
                          #{answer.question_index + 1} {answer.hitza}: {answer.chosen}{' '}
                          {answer.is_correct ? 'ZUZEN' : `OKER (${answer.correct})`} [
                          {answer.points} p]
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
};

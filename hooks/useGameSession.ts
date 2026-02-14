import { useCallback, useRef, useState } from 'react';
import { AuthUser, FailedWordStat } from '../appTypes';
import { DifficultyLevel, GameStatus, Player, Question, WordData } from '../types';
import { generatePoolFromData } from '../lib/gameLogic';
import { formatLocalDate } from '../lib/dateUtils';
import {
  fetchAllActiveWords,
  hasPlayedDailyChallenge,
  insertGameAnswer,
  insertGameRun,
  saveDailyChallengeRun,
} from '../lib/supabaseRepo';

export type GameMode = 'regular' | 'daily';

type PendingDailyAnswer = {
  questionIndex: number;
  sourceId: string;
  hitza: string;
  chosen: string;
  correct: string;
  isCorrect: boolean;
  responseMs: number;
  points: number;
};

const QUESTIONS_PER_PLAYER = 10;
const DAILY_QUESTIONS = 10;
const BASE_POINTS_PER_CORRECT = 10;

const getTimeBonus = (seconds: number): number => {
  if (seconds < 2) return 5;
  if (seconds < 4) return 3;
  if (seconds <= 7) return 1;
  return 0;
};

type Params = {
  user: AuthUser | null;
  difficulty: DifficultyLevel;
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  ensureLevelWords: (level: DifficultyLevel) => Promise<WordData[]>;
  fetchMostFailedWords: () => Promise<FailedWordStat[]>;
  setStatus: (status: GameStatus) => void;
  setHasPlayedToday: (value: boolean) => void;
  refreshCompetitionData: () => Promise<void>;
};

export const useGameSession = ({
  user,
  difficulty,
  players,
  setPlayers,
  ensureLevelWords,
  fetchMostFailedWords,
  setStatus,
  setHasPlayedToday,
  refreshCompetitionData,
}: Params) => {
  const [gameMode, setGameMode] = useState<GameMode>('regular');
  const [questionPool, setQuestionPool] = useState<Question[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [currentAnswerBonus, setCurrentAnswerBonus] = useState(0);
  const [isLoadingWords, setIsLoadingWords] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const turnStartTimeRef = useRef<number>(0);
  const questionStartTimeRef = useRef<number>(0);
  const pendingDailyAnswersRef = useRef<PendingDailyAnswer[]>([]);

  const startNewGame = useCallback(
    async (isSolo: boolean = false) => {
      setGameMode('regular');
      setIsLoadingWords(true);
      try {
        if (isSolo && user) {
          const displayName = user.email?.split('@')[0].toUpperCase() || 'NI';
          setPlayers([
            {
              id: 0,
              name: displayName,
              score: 0,
              time: 0,
              correctAnswers: 0,
            },
          ]);
        }

        const totalNeeded = (isSolo ? 1 : players.length) * QUESTIONS_PER_PLAYER;
        const poolSource = await ensureLevelWords(difficulty);
        if (!poolSource.length) {
          alert('Ez da hitzik aurkitu maila honetan.');
          return;
        }

        let statsMap: Map<string, { wrong: number; attempts: number }> | undefined;
        if (user) {
          const failed = await fetchMostFailedWords();
          statsMap = new Map(
            failed.map((f) => [String(f.source_id), { wrong: f.wrong, attempts: f.attempts }])
          );
        }

        const newPool = generatePoolFromData(totalNeeded, poolSource, statsMap);
        setQuestionPool(newPool);
        pendingDailyAnswersRef.current = [];
        setCurrentPlayerIndex(0);
        setCurrentQuestionIndex(0);
        setStatus(GameStatus.INTERMISSION);
      } finally {
        setIsLoadingWords(false);
      }
    },
    [difficulty, ensureLevelWords, fetchMostFailedWords, players.length, setPlayers, setStatus, user]
  );

  const startDailyCompetition = useCallback(async () => {
    if (!user) return;
    const today = formatLocalDate(new Date());
    const alreadyPlayed = await hasPlayedDailyChallenge(user.id, today);
    if (alreadyPlayed) {
      setHasPlayedToday(true);
      alert('Gaurko lehiaketa jada jokatu duzu.');
      return;
    }

    setGameMode('daily');
    setIsLoadingWords(true);
    try {
      const allWords = await fetchAllActiveWords();
      if (!allWords.length) {
        alert('Ez dago lehiaketarako hitzik eskuragarri.');
        return;
      }

      const displayName = user.email?.split('@')[0].toUpperCase() || 'NI';
      setPlayers([
        {
          id: 0,
          name: displayName,
          score: 0,
          time: 0,
          correctAnswers: 0,
        },
      ]);

      const pool = generatePoolFromData(DAILY_QUESTIONS, allWords);
      setQuestionPool(pool);
      setCurrentPlayerIndex(0);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      pendingDailyAnswersRef.current = [];
      setStatus(GameStatus.INTERMISSION);
    } finally {
      setIsLoadingWords(false);
    }
  }, [setHasPlayedToday, setPlayers, setStatus, user]);

  const startPlayerTurn = () => {
    turnStartTimeRef.current = Date.now();
    questionStartTimeRef.current = Date.now();
    pendingDailyAnswersRef.current = [];
    setCurrentAnswerBonus(0);
    setStatus(GameStatus.PLAYING);
    setCurrentQuestionIndex(0);
    setIsAnswered(false);
    setSelectedAnswer(null);
  };

  const handlePlayerNameChange = (id: number, name: string) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  };

  const handleAnswer = async (answer: string) => {
    if (isAnswered) return;
    const poolIdx = currentPlayerIndex * QUESTIONS_PER_PLAYER + currentQuestionIndex;
    const currentQuestion = questionPool[poolIdx];
    if (!currentQuestion) return;

    const answerTimeSeconds = (Date.now() - questionStartTimeRef.current) / 1000;
    const responseMs = Math.max(1, Math.round(answerTimeSeconds * 1000));
    const isCorrect = answer === currentQuestion.correctAnswer;
    const bonus = isCorrect ? getTimeBonus(answerTimeSeconds) : 0;
    const earnedPoints = isCorrect ? BASE_POINTS_PER_CORRECT + bonus : 0;
    setSelectedAnswer(answer);
    setIsAnswered(true);
    setCurrentAnswerBonus(bonus);

    if (user && gameMode === 'regular') {
      void insertGameAnswer({
        userId: user.id,
        difficulty,
        question: currentQuestion,
        answer,
        isCorrect,
      });
    }

    if (gameMode === 'daily') {
      pendingDailyAnswersRef.current.push({
        questionIndex: currentQuestionIndex,
        sourceId: String(currentQuestion.wordData.id),
        hitza: currentQuestion.wordData.hitza,
        chosen: answer,
        correct: currentQuestion.correctAnswer,
        isCorrect,
        responseMs,
        points: earnedPoints,
      });
    }

    if (isCorrect) {
      setPlayers((prev) =>
        prev.map((p, idx) =>
          idx === currentPlayerIndex
            ? {
                ...p,
                score: p.score + earnedPoints,
                correctAnswers: p.correctAnswers + 1,
              }
            : p
        )
      );
    }
  };

  const saveToSupabase = useCallback(
    async (player: Player) => {
      if (!user) return;
      setIsSaving(true);
      try {
        if (gameMode === 'daily') {
          const today = formatLocalDate(new Date());
          const result = await saveDailyChallengeRun({
            userId: user.id,
            playerName: player.name,
            challengeDate: today,
            score: player.score,
            correct: player.correctAnswers,
            wrong: DAILY_QUESTIONS - player.correctAnswers,
            total: DAILY_QUESTIONS,
            timeSeconds: player.time,
            answers: pendingDailyAnswersRef.current,
          });
          if (!result.ok && result.reason === 'already_played') {
            alert('Gaurko lehiaketa jada erregistratuta dago.');
          }
          await refreshCompetitionData();
        } else {
          await insertGameRun({
            userId: user.id,
            difficulty,
            total: QUESTIONS_PER_PLAYER,
            correct: player.correctAnswers,
            wrong: QUESTIONS_PER_PLAYER - player.correctAnswers,
            timeSeconds: player.time,
          });
        }
      } finally {
        setIsSaving(false);
      }
    },
    [difficulty, gameMode, refreshCompetitionData, user]
  );

  const finishPlayerTurn = useCallback(async () => {
    const endTime = Date.now();
    const realSeconds = (endTime - turnStartTimeRef.current) / 1000;
    const updatedPlayers = players.map((p, idx) =>
      idx === currentPlayerIndex ? { ...p, time: realSeconds } : p
    );
    setPlayers(updatedPlayers);

    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex((prev) => prev + 1);
      setStatus(GameStatus.INTERMISSION);
    } else {
      if (user && players.length === 1) await saveToSupabase(updatedPlayers[0]);
      setStatus(GameStatus.SUMMARY);
    }
  }, [currentPlayerIndex, players, saveToSupabase, setPlayers, setStatus, user]);

  const nextQuestion = () => {
    if (currentQuestionIndex < QUESTIONS_PER_PLAYER - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      questionStartTimeRef.current = Date.now();
      setCurrentAnswerBonus(0);
      setIsAnswered(false);
      setSelectedAnswer(null);
    } else {
      void finishPlayerTurn();
    }
  };

  return {
    gameMode,
    questionPool,
    currentPlayerIndex,
    currentQuestionIndex,
    selectedAnswer,
    isAnswered,
    currentAnswerBonus,
    isLoadingWords,
    isSaving,
    startNewGame,
    startDailyCompetition,
    startPlayerTurn,
    handlePlayerNameChange,
    handleAnswer,
    nextQuestion,
  };
};

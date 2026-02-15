import React from 'react';
import { Question } from '../../types';
import { AppShell } from '../layout/AppShell';

type PlayingScreenProps = {
  playerName: string;
  currentAnswerBonus: number;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: Question;
  isAnswered: boolean;
  selectedAnswer: string | null;
  onAnswer: (answer: string) => void;
  onNextQuestion: () => void;
  onExit: () => void;
  topRightControl?: React.ReactNode;
};

export const PlayingScreen: React.FC<PlayingScreenProps> = ({
  playerName,
  currentAnswerBonus,
  currentQuestionIndex,
  totalQuestions,
  currentQuestion,
  isAnswered,
  selectedAnswer,
  onAnswer,
  onNextQuestion,
  onExit,
  topRightControl,
}) => {
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  return (
    <AppShell
      topRightControl={topRightControl}
      header={
        <div className="flex w-full items-center justify-between gap-3">
          <button onClick={onExit} className="btn-ghost">
            Irten
          </button>
          <div className="text-center">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              {playerName}
            </h2>
          </div>
          <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-700">
            {currentQuestionIndex + 1}/{totalQuestions}
          </span>
        </div>
      }
      footer={
        <button
          onClick={isAnswered ? onNextQuestion : undefined}
          disabled={!isAnswered}
          className="btn-primary w-full py-3.5 disabled:opacity-45"
        >
          {currentQuestionIndex < totalQuestions - 1 ? 'Hurrengoa' : 'Bukatu'}
        </button>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <section className="surface-card surface-card--muted p-5 md:p-6">
          <p className="font-display mt-1 break-words text-5xl font-semibold text-slate-900 md:text-6xl">
            {currentQuestion.wordData.hitza}
          </p>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-end text-xs font-semibold text-slate-500">
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-600 to-cyan-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="surface-card p-4 md:p-5">
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {currentQuestion.options.map((option) => {
                let buttonClass =
                  'w-full rounded-2xl border px-4 py-3 text-left transition ';

                if (!isAnswered) {
                  buttonClass +=
                    'border-slate-200 bg-white text-slate-800 hover:border-teal-400';
                } else if (option === currentQuestion.correctAnswer) {
                  buttonClass +=
                    'border-emerald-400 bg-emerald-50 text-emerald-800';
                } else if (option === selectedAnswer) {
                  buttonClass += 'border-rose-300 bg-rose-50 text-rose-700';
                } else {
                  buttonClass += 'border-slate-200 bg-slate-50 text-slate-400';
                }

                return (
                  <button
                    key={option}
                    disabled={isAnswered}
                    onClick={() => onAnswer(option)}
                    className={buttonClass}
                  >
                    <div className="font-display text-xl font-semibold leading-tight">
                      {option}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
};

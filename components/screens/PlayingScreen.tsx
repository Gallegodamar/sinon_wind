import React from 'react';
import { Question } from '../../types';
import mascot from '../../assets/robin-mascot.svg';

type PlayingScreenProps = {
  playerName: string;
  currentAnswerBonus: number;
  currentQuestionIndex: number;
  currentQuestion: Question;
  isAnswered: boolean;
  selectedAnswer: string | null;
  onAnswer: (answer: string) => void;
  onNextQuestion: () => void;
  onExit: () => void;
};

export const PlayingScreen: React.FC<PlayingScreenProps> = ({
  playerName,
  currentAnswerBonus,
  currentQuestionIndex,
  currentQuestion,
  isAnswered,
  selectedAnswer,
  onAnswer,
  onNextQuestion,
  onExit,
}) => {
  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-[#eeedf2] safe-pt safe-px">
      <div className="mx-auto flex h-full w-full max-w-[430px] flex-col overflow-hidden rounded-[2.3rem] border border-[#e2e3ea] bg-[#f7f7fa] shadow-[0_25px_50px_-36px_rgba(0,0,0,0.6)]">
        <div className="shrink-0 px-4 pt-3">
          <div className="mb-4 flex items-center justify-between text-[#5a6072]">
            <button onClick={onExit} className="rounded-xl p-1 text-[#66c2ae]">
              <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.7 15.7a1 1 0 01-1.4 0l-5-5a1 1 0 010-1.4l5-5a1 1 0 111.4 1.4L8.41 10l4.3 4.3a1 1 0 010 1.4z" clipRule="evenodd"/></svg>
            </button>
            <div className="text-[11px] font-black uppercase tracking-wide text-[#a0a5b2]">{playerName}</div>
          </div>

          <h2 className="text-[56px] leading-none text-[#2d3242]" style={{ fontFamily: "'Trebuchet MS','Avenir Next',sans-serif" }}>
            Aukeratu sinonimo zuzena
          </h2>
          <h3 className="mt-4 text-[64px] leading-none text-[#2f3443]" style={{ fontFamily: "'Trebuchet MS','Avenir Next',sans-serif" }}>
            {currentQuestion.wordData.hitza}
          </h3>
          <p className="mt-2 text-[12px] font-black uppercase tracking-wider text-[#9da4b2]">{currentQuestionIndex + 1}/10 · {currentAnswerBonus > 0 ? `+${currentAnswerBonus} bonus` : 'prest'}</p>
        </div>

        <div className="grow overflow-y-auto px-4 pb-3">
          <div className="mt-4 space-y-3">
            {currentQuestion.options.map((opt, i) => {
              let style =
                'w-full rounded-2xl border px-4 py-4 text-left text-[40px] leading-none transition-all ' +
                "font-['Trebuchet_MS','Avenir_Next',sans-serif] ";

              if (!isAnswered) {
                style += 'border-[#d6dbe6] bg-white text-[#2d3342] hover:border-[#80cfbc]';
              } else if (opt === currentQuestion.correctAnswer) {
                style += 'border-[#64c5a5] bg-[#e1f6ed] text-[#1f7a5e]';
              } else if (opt === selectedAnswer) {
                style += 'border-[#efb0b0] bg-[#ffecec] text-[#b84a4a]';
              } else {
                style += 'border-[#eceef2] bg-[#f7f8fb] text-[#b2b7c5]';
              }

              return (
                <button key={i} disabled={isAnswered} onClick={() => onAnswer(opt)} className={style}>
                  {opt}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-end justify-between rounded-[2rem] bg-gradient-to-t from-[#e3efe0] to-[#edf4ea] px-3 pt-4">
            <div className="mb-3 rounded-3xl border border-[#cde1cc] bg-[#f2f8ef] px-4 py-3 text-[#5b6761]">
              <p className="text-[31px] leading-none" style={{ fontFamily: "'Trebuchet MS','Avenir Next',sans-serif" }}>
                {isAnswered
                  ? currentAnswerBonus > 0
                    ? `+${currentAnswerBonus} primeran!`
                    : 'ondo pentsatuta!'
                  : 'Ia...antzekoa da, baina ez bera'}
              </p>
            </div>
            <img src={mascot} alt="Elio" className="h-32 w-32" draggable={false} />
          </div>
        </div>

        <div className="shrink-0 border-t border-[#e3e6ee] bg-white/92 p-3">
          <button
            onClick={isAnswered ? onNextQuestion : undefined}
            disabled={!isAnswered}
            className={
              'w-full rounded-2xl py-4 text-2xl font-black uppercase tracking-wide transition-all ' +
              (isAnswered ? 'bg-gradient-to-r from-[#64c998] to-[#2fab8f] text-white' : 'bg-[#d9dee6] text-[#7f8798]')
            }
          >
            {currentQuestionIndex < 9 ? 'Hurrengoa' : 'Bukatu'}
          </button>
        </div>
      </div>
    </div>
  );
};

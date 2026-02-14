import React from 'react';

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
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-indigo-950 p-6">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl text-center max-w-sm w-full border-b-[12px] border-indigo-600 animate-in zoom-in duration-300">
        <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center text-4xl font-black mx-auto mb-6 shadow-xl">
          {playerNumber}
        </div>
        <p className="text-xs text-slate-400 font-black mb-1 uppercase tracking-widest">
          Prest?
        </p>
        <h2 className="text-3xl font-black text-slate-900 mb-8 uppercase tracking-tighter">
          {playerName}
        </h2>
        <button
          onClick={onStart}
          className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-lg active:scale-95 text-xl uppercase tracking-widest"
        >
          HASI
        </button>
      </div>
    </div>
  );
};

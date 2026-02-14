import React from 'react';

type AuthScreenProps = {
  username: string;
  password: string;
  authError: string | null;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
};

export const AuthScreen: React.FC<AuthScreenProps> = ({
  username,
  password,
  authError,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  onBack,
}) => {
  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-indigo-950 p-6">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border-b-8 border-indigo-600">
        <button
          onClick={onBack}
          className="mb-4 text-xs font-black text-slate-400 uppercase tracking-widest"
        >
          â† Atzera
        </button>
        <h2 className="text-3xl font-black text-indigo-950 mb-1 uppercase tracking-tighter text-center">
          Saioa hasi
        </h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="ID"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          <input
            type="password"
            placeholder="Pasahitza"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          {authError && (
            <p className="text-rose-500 text-xs font-bold text-center">
              {authError}
            </p>
          )}
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-lg active:scale-95 transition-all text-lg uppercase tracking-widest"
          >
            SARTU
          </button>
        </form>
      </div>
    </div>
  );
};

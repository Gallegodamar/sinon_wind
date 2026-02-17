import React, { useMemo } from 'react';
import { AuthUser } from '../../appTypes';

type Props = {
  user: AuthUser;
  onLogout: () => Promise<void> | void;
};

const PALETTES = [
  ['#084a9c', '#0b67c6', '#5fdef0'],
  ['#0a5db5', '#1086df', '#88eef7'],
  ['#094183', '#0d5fb6', '#64d4ef'],
  ['#0a6fcb', '#10a3e9', '#9cf7fb'],
  ['#0a4f98', '#0f75d0', '#7ce7f7'],
  ['#0b5ba8', '#1190e3', '#74e2f5'],
];

const hashText = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const getDisplayName = (user: AuthUser): string => {
  const fromMail = user.email?.split('@')[0]?.trim();
  if (fromMail) return fromMail;
  return `erabiltzailea-${user.id.slice(0, 6)}`;
};

const getInitials = (value: string): string => {
  const clean = value
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 2)
    .toUpperCase();
  return clean || 'U';
};

const buildAvatarUri = (seed: string, initials: string): string => {
  const hash = hashText(seed);
  const [base, accent, glow] = PALETTES[hash % PALETTES.length];
  const orbX = 18 + (hash % 24);
  const orbY = 18 + ((hash >> 3) % 24);
  const orbR = 9 + ((hash >> 5) % 8);
  const smallX = 44 + ((hash >> 7) % 22);
  const smallY = 42 + ((hash >> 10) % 18);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" role="img" aria-label="${initials}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${base}" />
      <stop offset="100%" stop-color="${accent}" />
    </linearGradient>
  </defs>
  <rect width="80" height="80" rx="40" fill="url(#g)" />
  <circle cx="${orbX}" cy="${orbY}" r="${orbR}" fill="${glow}" opacity="0.36" />
  <circle cx="${smallX}" cy="${smallY}" r="10" fill="#ffffff" opacity="0.2" />
  <text x="40" y="51" text-anchor="middle" font-family="Sora, sans-serif" font-size="28" font-weight="700" fill="#ffffff">${initials}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const UserIdentityBadge: React.FC<Props> = ({ user, onLogout }) => {
  const displayName = getDisplayName(user);
  const avatarSrc = useMemo(
    () => buildAvatarUri(user.id, getInitials(displayName)),
    [displayName, user.id]
  );

  return (
    <button
      type="button"
      onClick={() => {
        void onLogout();
      }}
      className="user-identity-badge"
      aria-label={`${displayName} - saioa itxi`}
      title="Saioa itxi"
    >
      <img src={avatarSrc} alt={displayName} />
      <span>{displayName}</span>
      <svg className="h-4 w-4 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M3 5a2 2 0 012-2h5a1 1 0 110 2H5v10h5a1 1 0 110 2H5a2 2 0 01-2-2V5zm9.3.3a1 1 0 011.4 0l4.3 4.3a1 1 0 010 1.4l-4.3 4.3a1 1 0 01-1.4-1.4L15 11H8a1 1 0 110-2h7l-2.7-2.3a1 1 0 010-1.4z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
};

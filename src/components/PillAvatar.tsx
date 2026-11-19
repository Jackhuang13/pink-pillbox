import type { MedIconId } from '../domain/icons';
import { MED_ICONS, resolveMedIcon } from '../domain/icons';

const PALETTE = ['#ffd6e7', '#ffe9c7', '#d9f2e3', '#e6ddff', '#d7ecff'];

interface Props {
  icon?: MedIconId;
  seed?: string;
  size?: number;
}

function SmileFace({ cx, cy, scale = 1, blush = '#ffc9dd' }: { cx: number; cy: number; scale?: number; blush?: string }) {
  return (
    <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
      <circle cx="-6" cy="0" r="2.2" fill="#6b4f5b" />
      <circle cx="6" cy="0" r="2.2" fill="#6b4f5b" />
      <path d="M-4 4.5 q4 3.5 8 0" stroke="#6b4f5b" strokeWidth="2.1" fill="none" strokeLinecap="round" />
      <circle cx="-10" cy="4" r="2.7" fill={blush} opacity="0.9" />
      <circle cx="10" cy="4" r="2.7" fill={blush} opacity="0.9" />
    </g>
  );
}

function renderArtwork(icon: MedIconId) {
  switch (icon) {
    case 'capsule':
      return (
        <g transform="rotate(-28 48 48)">
          <rect x="18" y="34" width="60" height="28" rx="14" fill="#ffffff" stroke="#e88bb0" strokeWidth="3.2" />
          <path d="M48 34 h16 a14 14 0 0 1 0 28 h-16 z" fill="#ff9ec4" />
          <line x1="48" y1="34" x2="48" y2="62" stroke="#e88bb0" strokeWidth="3.2" />
          <path d="M58 43 h10" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          <SmileFace cx={33} cy={46} scale={0.85} />
        </g>
      );
    case 'tablet':
      return (
        <g>
          <circle cx="48" cy="48" r="28" fill="#fff3cc" stroke="#e8b86b" strokeWidth="3.2" />
          <line x1="29" y1="35" x2="67" y2="35" stroke="#efd092" strokeWidth="2.4" strokeLinecap="round" />
          <SmileFace cx={48} cy={51} scale={1.08} blush="#ffbfd3" />
        </g>
      );
    case 'heart_pill':
      return (
        <g>
          <path
            d="M48 74 C22 57 18 39 27 29 C34 22 44 25 48 33 C52 25 62 22 69 29 C78 39 74 57 48 74 Z"
            fill="#ffa7c9"
            stroke="#e87ea7"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
          <ellipse cx="34" cy="36" rx="5.5" ry="3.2" transform="rotate(-24 34 36)" fill="#ffffff" opacity="0.6" />
          <SmileFace cx={48} cy={49} scale={0.95} blush="#ffd6e7" />
        </g>
      );
    case 'syrup':
      return (
        <g>
          <rect x="35" y="15" width="26" height="11" rx="4.5" fill="#ff8fb8" stroke="#e474a2" strokeWidth="2.8" />
          <rect x="39" y="26" width="18" height="7" fill="#ffffff" stroke="#e88bb0" strokeWidth="2.4" />
          <rect x="26" y="32" width="44" height="46" rx="14" fill="#ffffff" stroke="#e88bb0" strokeWidth="3.2" />
          <path d="M28 47 h40 v19 a12 12 0 0 1 -12 10 h-16 a12 12 0 0 1 -12 -10 z" fill="#ffb3cf" />
          <line x1="58" y1="53" x2="64" y2="53" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="60" y1="60" x2="64" y2="60" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
          <SmileFace cx={48} cy={58} scale={0.95} blush="#ffe0ec" />
        </g>
      );
    case 'dropper':
      return (
        <g>
          <path d="M35 28 v-7 a9 9 0 0 1 18 0 v7 z" fill="#9fe0c0" stroke="#6dbb95" strokeWidth="2.8" />
          <rect x="31" y="28" width="26" height="7" rx="3.5" fill="#ffffff" stroke="#6dbb95" strokeWidth="2.6" />
          <rect x="26" y="35" width="36" height="42" rx="13" fill="#ebfbf2" stroke="#6dbb95" strokeWidth="3" />
          <SmileFace cx={44} cy={55} scale={0.9} />
          <path
            d="M72 28 C72 28 79 37 79 42 a7 7 0 0 1 -14 0 C65 37 72 28 72 28 Z"
            fill="#9ee0ff"
            stroke="#6bbce8"
            strokeWidth="2.4"
          />
        </g>
      );
    case 'sachet':
      return (
        <g>
          <rect x="23" y="20" width="50" height="56" rx="9" fill="#f1ebff" stroke="#b89ef0" strokeWidth="3" />
          <path d="M25 22 h46 v10 h-46 z" fill="#dcd0ff" />
          <line x1="25" y1="32" x2="71" y2="32" stroke="#b89ef0" strokeWidth="2.2" strokeDasharray="4 3" />
          <rect x="31" y="38" width="34" height="28" rx="8" fill="#ffffff" />
          <SmileFace cx={48} cy={51} scale={0.88} />
        </g>
      );
    case 'inhaler':
      return (
        <g>
          <rect x="30" y="16" width="20" height="18" rx="5" fill="#ffffff" stroke="#7cb4e2" strokeWidth="2.8" />
          <path
            d="M25 30 a8 8 0 0 1 8 -8 h14 a8 8 0 0 1 8 8 v19 h14 a9 9 0 0 1 9 9 v7 a9 9 0 0 1 -9 9 h-34 a10 10 0 0 1 -10 -10 z"
            fill="#c8e7ff"
            stroke="#7cb4e2"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <rect x="69" y="54" width="6" height="14" rx="3" fill="#ffffff" />
          <circle cx="80" cy="48" r="4.5" fill="#ffffff" stroke="#9ecbf0" strokeWidth="1.8" />
          <circle cx="84" cy="41" r="3" fill="#ffffff" stroke="#9ecbf0" strokeWidth="1.6" />
          <SmileFace cx={41} cy={53} scale={0.84} />
        </g>
      );
    case 'ointment':
      return (
        <g>
          <rect x="26" y="16" width="44" height="9" rx="3.5" fill="#ffc9ad" stroke="#e89b78" strokeWidth="2.6" />
          <polygon
            points="29,25 67,25 61,63 35,63"
            fill="#ffe9dc"
            stroke="#e89b78"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <rect x="38" y="63" width="20" height="12" rx="4.5" fill="#ff9ec4" stroke="#e474a2" strokeWidth="2.8" />
          <SmileFace cx={48} cy={43} scale={0.92} blush="#ffb8d0" />
        </g>
      );
  }
}

export function PillAvatar({ icon, seed = 'pillpal', size = 56 }: Props) {
  const resolved = resolveMedIcon(icon);
  let bg: string = MED_ICONS[resolved].bg;
  if (!icon) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    bg = PALETTE[h % PALETTE.length];
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      className="pill-avatar"
      role="img"
      aria-label={MED_ICONS[resolved].en}
    >
      <rect width="96" height="96" rx="24" fill={bg} />
      {renderArtwork(resolved)}
    </svg>
  );
}

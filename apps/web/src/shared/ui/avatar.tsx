const TONES = ['pink', 'cyan', 'violet', 'orange'] as const;

type AvatarTone = (typeof TONES)[number];

const toneClasses: Readonly<Record<AvatarTone, string>> = {
  pink: 'bg-pink text-on-pink',
  cyan: 'bg-cyan text-on-cyan',
  violet: 'bg-violet text-on-violet',
  orange: 'bg-orange text-on-orange',
};

export function avatarTone(index: number): AvatarTone {
  return TONES[index % TONES.length] ?? TONES[0];
}

/** First character of a name, whole even outside the basic plane. */
export function initialOf(name: string): string {
  return (Array.from(name.trim())[0] ?? '').toUpperCase();
}

interface AvatarProps {
  readonly name: string;
  /** Position of the player. Colours are decoration, so nothing else depends on it. */
  readonly index: number;
}

export function Avatar({ name, index }: AvatarProps) {
  const tone = avatarTone(index);
  return (
    <span
      aria-hidden="true"
      data-testid="player-avatar"
      data-tone={tone}
      className={`grid size-9 shrink-0 place-items-center rounded-full font-display text-sm font-bold ${toneClasses[tone]}`}
    >
      {initialOf(name)}
    </span>
  );
}

interface Props {
  size?: number;
  className?: string;
}

export function HadaqLogo({ size = 32, className = '' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Radar arcs */}
      <path d="M50 15 A35 35 0 0 0 22 25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.25" />
      <path d="M50 15 A35 35 0 0 1 78 25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.25" />
      {/* Eye shape */}
      <path
        d="M50 28C32 28 18 50 18 50C18 50 32 72 50 72C68 72 82 50 82 50C82 50 68 28 50 28Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Iris */}
      <circle cx="50" cy="50" r="12" stroke="currentColor" strokeWidth="2.5" />
      {/* Pupil */}
      <circle cx="50" cy="50" r="4.5" fill="currentColor" />
    </svg>
  );
}

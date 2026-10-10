type LogoProps = { size?: number; className?: string };

/** MonkePay mark (plain SVG; wrap it in a Link where needed). */
export function Logo({ size = 32, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className} aria-hidden="true">
      <path
        d="M 50 10 C 58 10, 65 11, 71 14 C 76 10, 84 10, 88 16 C 94 22, 92 32, 87 36 C 91 44, 93 54, 90 64 C 84 80, 68 92, 50 92 C 32 92, 16 80, 10 64 C 7 54, 9 44, 13 36 C 8 32, 6 22, 12 16 C 16 10, 24 10, 29 14 C 35 11, 42 10, 50 10 Z"
        fill="var(--accent)"
      />
      {size >= 20 && (
        <>
          <circle cx="18" cy="21" r="5" fill="var(--bg-base)" />
          <circle cx="82" cy="21" r="5" fill="var(--bg-base)" />
        </>
      )}
    </svg>
  );
}

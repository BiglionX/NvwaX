/**
 * ProClaw Logo (white-label).
 *
 * Inline SVG so the static export has zero external asset dependencies.
 * Brand:
 *  - Wordmark "ProClaw" in slate-900
 *  - Mark: stylized "claw" triangle/arrowhead in brand purple (#6D4AFF)
 *  - The `<title>ProClaw</title>` element doubles as the a11y label and
 *    lets DoD B4 verification grep for it.
 */

export type ProClawLogoProps = {
  size?: number;
  showWordmark?: boolean;
  className?: string;
};

export function ProClawLogo({ size = 32, showWordmark = true, className }: ProClawLogoProps) {
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}
      aria-label="ProClaw"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-hidden={showWordmark ? 'true' : 'false'}
      >
        <title>ProClaw</title>
        <defs>
          <linearGradient id="pcMark" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#6D4AFF" />
            <stop offset="1" stopColor="#3B1FA8" />
          </linearGradient>
        </defs>
        {/* Rounded square background */}
        <rect x="0" y="0" width="40" height="40" rx="9" fill="url(#pcMark)" />
        {/* Claw mark: three converging triangles */}
        <path
          d="M20 9 L29 25 L11 25 Z"
          fill="#FFFFFF"
          opacity="0.95"
        />
        <path
          d="M14 27 L20 19 L26 27 Z"
          fill="#FFFFFF"
          opacity="0.55"
        />
      </svg>
      {showWordmark ? (
        <span
          style={{
            fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
            fontWeight: 700,
            fontSize: Math.max(20, size * 0.62),
            letterSpacing: '-0.01em',
            color: '#0F172A',
          }}
        >
          ProClaw
        </span>
      ) : null}
    </span>
  );
}

export default ProClawLogo;

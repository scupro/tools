/**
 * Dogbro Tools brand mark: a dog head on the brand-blue tile, so it can be
 * reused at any size (navbar, footer, docs) without a raster fallback.
 * Keep in sync with `public/favicon.svg`.
 */
interface LogoProps {
  size?: number;
  className?: string;
  /** Decorative copy next to the word mark skips the accessible name. */
  decorative?: boolean;
}

export default function Logo({ size = 24, className, decorative = false }: LogoProps) {
  const mark = (
    <g fill="#fff" transform="translate(32 32) scale(1.16) translate(-32 -32)">
      <path d="M18 26.5 L13.6 13.2 Q13.2 11.8 14.5 12.4 L28.6 18.6 Z" />
      <path d="M46 26.5 L50.4 13.2 Q50.8 11.8 49.5 12.4 L35.4 18.6 Z" />
      <rect x="15" y="17.5" width="34" height="35" rx="13.5" />
    </g>
  );
  const face = (
    <g fill="#2563eb" transform="translate(32 32) scale(1.16) translate(-32 -32)">
      <circle cx="25" cy="33" r="3.1" />
      <circle cx="39" cy="33" r="3.1" />
      <path d="M28.2 40.5 h7.6 a3.8 3.8 0 0 1 -7.6 0 z" />
    </g>
  );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role={decorative ? 'presentation' : 'img'}
      aria-label={decorative ? undefined : 'Dogbro Tools'}
      aria-hidden={decorative || undefined}
    >
      <rect width="64" height="64" rx="14" fill="#2563eb" />
      {mark}
      {face}
    </svg>
  );
}
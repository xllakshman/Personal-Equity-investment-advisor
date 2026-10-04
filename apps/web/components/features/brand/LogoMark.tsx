/** Continuous-stroke lowercase “e”. */
export function LogoMark({
  size = 28,
  gid = "eq-logo",
}: {
  size?: number;
  gid?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden
      className="eqveste-mark"
    >
      <defs>
        <linearGradient
          id={gid}
          x1="6"
          y1="6"
          x2="30"
          y2="30"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#0a84ff" />
          <stop offset="35%" stopColor="#bf5af2" />
          <stop offset="68%" stopColor="#ff9f0a" />
          <stop offset="100%" stopColor="#30d158" />
        </linearGradient>
      </defs>
      <path
        d="M7.5 18 H28.5 A10.5 10.5 0 1 0 25.42 25.42"
        stroke={`url(#${gid})`}
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

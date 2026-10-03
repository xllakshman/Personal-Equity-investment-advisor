/** Stroke mark from Claude App.dc.html — gradient path, not a filled square. */
export function EqvesteMark({
  size = 28,
  gid = "eqeg",
}: {
  size?: number;
  gid?: string;
}) {
  const fill = `url(#${gid})`;
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
          x1="5"
          y1="29"
          x2="34"
          y2="12"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0a84ff" />
          <stop offset=".45" stopColor="#30d158" />
          <stop offset=".72" stopColor="#ff9f0a" />
          <stop offset="1" stopColor="#bf5af2" />
        </linearGradient>
      </defs>
      <path
        d="M5 20H23A9 9 0 1 0 20.4 26.4L25 21.6L27.6 23.6L33 12.5"
        stroke={fill}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M28.8 14.2L33 12.5L34 16.9"
        stroke={fill}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

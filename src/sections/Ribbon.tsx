// The comet tail: a wide, silky band of warm colour sweeping up behind the hero demo.
// Pure SVG, drawn once; the slow drift lives in CSS and stops for reduced-motion users.
export function Ribbon() {
  return (
    <div className="ribbon" aria-hidden="true">
      <svg viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="tail-a" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#ffb547" />
            <stop offset="0.28" stopColor="#ff7a59" />
            <stop offset="0.55" stopColor="#f2509b" />
            <stop offset="0.8" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#5a8dff" />
          </linearGradient>
          <linearGradient id="tail-b" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5b36f2" stopOpacity="0.9" />
            <stop offset="0.5" stopColor="#f2509b" stopOpacity="0.75" />
            <stop offset="1" stopColor="#ffb547" stopOpacity="0.9" />
          </linearGradient>
          <pattern id="silk" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
            <rect width="1.2" height="7" fill="#ffffff" fillOpacity="0.22" />
          </pattern>
        </defs>
        <g className="ribbon-band">
          <path
            d="M-120 1080 C 160 760, 300 420, 940 -60 L 940 330 C 560 520, 360 820, 230 1120 Z"
            fill="url(#tail-a)"
          />
          <path
            d="M-60 1120 C 260 840, 420 560, 940 180 L 940 300 C 520 600, 380 860, 120 1140 Z"
            fill="url(#tail-b)"
            style={{ mixBlendMode: "multiply" }}
          />
          <path d="M-120 1080 C 160 760, 300 420, 940 -60 L 940 330 C 560 520, 360 820, 230 1120 Z" fill="url(#silk)" />
        </g>
      </svg>
    </div>
  );
}

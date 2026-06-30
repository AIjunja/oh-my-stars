export function VirtualStar() {
  return (
    <svg
      className="virtual-star"
      viewBox="0 0 320 320"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="starBodyGradient" x1="44" x2="246" y1="42" y2="266">
          <stop offset="0%" stopColor="#fff6a8" />
          <stop offset="48%" stopColor="#ffe66d" />
          <stop offset="100%" stopColor="#ff8bd8" />
        </linearGradient>
      </defs>

      <circle className="star-aura" cx="160" cy="164" r="132" />
      <path className="star-crown" d="M122 86 137 41l24 35 26-35 12 45Z" />
      <polygon
        className="star-body"
        points="160 37 190 116 275 121 209 174 232 257 160 211 88 257 111 174 45 121 130 116"
      />
      <path className="star-arm" d="M102 174c-24 10-42 27-55 51" />
      <path className="star-arm" d="M214 164c30-5 48 7 63 28" />
      <circle className="star-face" cx="132" cy="150" r="9" />
      <circle className="star-face" cx="183" cy="150" r="9" />
      <circle className="star-cheek" cx="112" cy="172" r="10" />
      <circle className="star-cheek" cx="203" cy="172" r="10" />
      <path className="star-smile" d="M139 178c12 12 30 12 42 0" />
      <g transform="translate(246 188) rotate(-18)">
        <rect className="star-mic" x="0" y="0" width="34" height="50" rx="16" />
        <path className="star-mic-line" d="M8 16h18M8 27h18" />
        <path className="star-mic-line" d="M17 50v28M2 78h30" />
      </g>
    </svg>
  )
}

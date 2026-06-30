import { SIGNATURE_PATH } from '../signature'

type SignatureOverlayProps = {
  active: boolean
  runId: number
}

export function SignatureOverlay({ active, runId }: SignatureOverlayProps) {
  return (
    <svg
      className={`signature-overlay ${active ? 'signature-overlay--active' : ''}`}
      viewBox="0 0 320 120"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="signatureGradient" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="#35e7ff" />
          <stop offset="42%" stopColor="#ff4fb8" />
          <stop offset="100%" stopColor="#fff3a8" />
        </linearGradient>
        <filter id="signatureGlow" x="-30%" y="-80%" width="160%" height="260%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feColorMatrix
            in="blur"
            result="glow"
            values="1 0 0 0 0.08  0 1 0 0 0.68  0 0 1 0 1  0 0 0 0.95 0"
          />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        className="signature-base"
        d={SIGNATURE_PATH}
        fill="none"
        pathLength="1"
        stroke="#35e7ff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="9"
      />
      <path
        key={runId}
        className="signature-stroke"
        d={SIGNATURE_PATH}
        fill="none"
        filter="url(#signatureGlow)"
        pathLength="1"
        stroke="url(#signatureGradient)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6"
      />
      <path
        className="signature-spark"
        d="M42 22v18M33 31h18"
        fill="none"
        stroke="#fff3a8"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        className="signature-spark"
        d="M244 12v22M233 23h22"
        fill="none"
        stroke="#35e7ff"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        className="signature-spark"
        d="M286 74v18M277 83h18"
        fill="none"
        stroke="#ff4fb8"
        strokeLinecap="round"
        strokeWidth="4"
      />
    </svg>
  )
}

import { motion, useReducedMotion } from "motion/react";

const TONES = {
  blocked: { fill: "#e0452b", ink: "#f1e6d2" },
  allowed: { fill: "#8fd3c7", ink: "#07121f" },
};

export default function Seal({ tone = "blocked", label, detail, className = "", stamp = true }) {
  const reduce = useReducedMotion();
  const { fill, ink } = TONES[tone];
  const animated = stamp && !reduce;
  return (
    <motion.span
      className={`seal ${className}`}
      aria-hidden="true"
      initial={animated ? { scale: 1.9, opacity: 0, rotate: -16 } : false}
      animate={{ scale: 1, opacity: 1, rotate: -7 }}
      transition={{ type: "spring", stiffness: 420, damping: 18, mass: 0.8 }}
    >
      <svg viewBox="0 0 120 120" focusable="false">
        <defs>
          <filter id={`seal-ink-${tone}`} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="1" seed="4" result="noise" />
            <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -9 0 0 0 7" result="holes" />
            <feComposite in="SourceGraphic" in2="holes" operator="in" result="speckled" />
            <feTurbulence type="turbulence" baseFrequency="0.045" numOctaves="2" seed="9" result="warp" />
            <feDisplacementMap in="speckled" in2="warp" scale="1.8" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <g filter={`url(#seal-ink-${tone})`}>
          <rect x="6" y="6" width="108" height="108" rx="12" fill={fill} />
          <rect x="14" y="14" width="92" height="92" rx="7" fill="none" stroke={ink} strokeWidth="3" />
          <text x="60" y={detail ? 58 : 68} textAnchor="middle" fill={ink}
            fontFamily="'Young Serif', Georgia, serif" fontSize="18">{label}</text>
          {detail && (
            <text x="60" y="86" textAnchor="middle" fill={ink}
              fontFamily="'Young Serif', Georgia, serif" fontSize="16">{detail}</text>
          )}
        </g>
      </svg>
    </motion.span>
  );
}

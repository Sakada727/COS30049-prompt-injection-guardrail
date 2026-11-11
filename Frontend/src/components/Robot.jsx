import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const INK = "#07121f";
const SCREEN = {
  idle: "#f1e6d2", scanning: "#f1e6d2", allowed: "#d9f0ea",
  blocked: "#e0452b", error: "#f3e1b5", lost: "#f1e6d2",
};
const FEATURE = {
  idle: INK, scanning: INK, allowed: "#0b4f45", blocked: "#f1e6d2", error: INK, lost: INK,
};
const LANTERN = {
  idle: "#f2b84b", scanning: "#f2b84b", allowed: "#8fd3c7",
  blocked: "#e0452b", error: "#f2b84b", lost: "#cbbfa8",
};

function useGaze(ref, enabled) {
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const onMove = (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = ref.current?.getBoundingClientRect();
        if (!box) return;
        const dx = (e.clientX - (box.left + box.width / 2)) / (window.innerWidth / 2);
        const dy = (e.clientY - (box.top + box.height / 2)) / (window.innerHeight / 2);
        setGaze({ x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) });
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, [ref, enabled]);
  return enabled ? gaze : { x: 0, y: 0 };
}

function useBlink(enabled) {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let timer;
    const schedule = () => {
      timer = setTimeout(() => {
        setClosed(true);
        timer = setTimeout(() => {
          setClosed(false);
          schedule();
        }, 140);
      }, 2600 + Math.random() * 3200);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [enabled]);
  return enabled && closed;
}

function Face({ mood, gaze, blink, color, reduce }) {
  const fade = reduce ? { duration: 0 } : { duration: 0.18 };

  if (mood === "allowed") {
    return (
      <motion.g key="allowed" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={fade}>
        <ellipse cx="74" cy="140" rx="10" ry="6" fill="#e8a598" opacity="0.7" />
        <ellipse cx="166" cy="140" rx="10" ry="6" fill="#e8a598" opacity="0.7" />
        <g fill="none" stroke={color} strokeWidth="7" strokeLinecap="round">
          <path d="M76 116 Q90 100 104 116" />
          <path d="M136 116 Q150 100 164 116" />
          <path d="M100 142 Q120 158 140 142" />
        </g>
      </motion.g>
    );
  }
  if (mood === "blocked") {
    return (
      <motion.g key="blocked" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={fade} fill={color}>
        <path d="M70 94 L106 106 L106 124 L70 124 Z" />
        <path d="M170 94 L134 106 L134 124 L170 124 Z" />
        <path d="M92 152 L101 142 L110 152 L120 142 L130 152 L139 142 L148 152" fill="none" stroke={color} strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
      </motion.g>
    );
  }
  if (mood === "error") {
    return (
      <motion.g key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}
        fill="none" stroke={color} strokeWidth="7" strokeLinecap="round">
        <path d="M78 110 L102 110" />
        <path d="M138 110 L162 110" />
        <path d="M98 148 Q109 140 120 148 Q131 156 142 148" />
      </motion.g>
    );
  }
  const look = mood === "lost" ? { x: -7, y: -6 } : { x: gaze.x * 9, y: gaze.y * 7 };
  return (
    <motion.g key="calm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade} fill={color}>
      <motion.g animate={look} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 22 }}>
        {[90, 150].map((cx) => (
          <motion.rect key={cx} x={cx - 11} y={96} width="22" height="30" rx="11"
            animate={{ scaleY: blink ? 0.12 : mood === "scanning" ? 0.55 : 1 }}
            transition={{ duration: 0.09 }} />
        ))}
      </motion.g>
      {mood === "lost" ? (
        <text x="120" y="158" textAnchor="middle" fontSize="26" fontWeight="700" fontFamily="Georgia, serif">?</text>
      ) : (
        <rect x="108" y="143" width="24" height="5" rx="2.5" />
      )}
    </motion.g>
  );
}

export default function Robot({ mood = "idle", trackPointer = false, className = "" }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const calm = mood === "idle" || mood === "scanning";
  const gaze = useGaze(ref, trackPointer && calm && !reduce);
  const blink = useBlink(calm && !reduce);
  const lantern = LANTERN[mood];

  return (
    <motion.svg
      ref={ref}
      viewBox="0 0 240 270"
      className={`robot robot--${mood} ${className}`}
      aria-hidden="true"
      focusable="false"
      style={{ "--robot-ink": lantern }}
      animate={mood === "blocked" && !reduce ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.45 }}
    >
      <defs>
        <pattern id="robot-waves" width="24" height="14" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="#f1e6d2" strokeOpacity="0.22" strokeWidth="1.6">
            <path d="M0 14 A12 12 0 0 1 24 14" />
            <path d="M5 14 A7 7 0 0 1 19 14" />
            <path d="M-12 7 A12 12 0 0 1 12 7 M12 7 A12 12 0 0 1 36 7" />
          </g>
        </pattern>
        <clipPath id="robot-head-clip"><rect x="30" y="44" width="180" height="152" rx="40" /></clipPath>
        <clipPath id="robot-screen-clip"><rect x="50" y="64" width="140" height="110" rx="26" /></clipPath>
        <filter id="robot-glow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="7" /></filter>
      </defs>

      <g fill="#061325" transform="translate(6 6)">
        <path d="M34 270 C38 230 74 214 120 214 C166 214 202 230 206 270 Z" />
        <rect x="30" y="44" width="180" height="152" rx="40" />
      </g>

      <path d="M34 270 C38 230 74 214 120 214 C166 214 202 230 206 270 Z" fill="#1b3b6b" />
      <path d="M34 270 C38 230 74 214 120 214 C166 214 202 230 206 270 Z" fill="url(#robot-waves)" />
      <path d="M34 270 C38 230 74 214 120 214 C166 214 202 230 206 270" fill="none" stroke={INK} strokeWidth="5" />
      <rect x="104" y="190" width="32" height="30" rx="6" fill="#14304f" stroke={INK} strokeWidth="4" />

      <motion.circle cx="120" cy="17" r="24" fill={lantern} filter="url(#robot-glow)"
        animate={reduce ? { opacity: 0.45 } : mood === "blocked" ? { opacity: [0.7, 0.2, 0.7] } : { opacity: [0.35, 0.55, 0.4, 0.5, 0.35] }}
        transition={mood === "blocked" ? { duration: 0.6, repeat: Infinity } : { duration: 3.2, repeat: Infinity }} />
      <line x1="120" y1="46" x2="120" y2="28" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <rect x="112" y="3" width="16" height="4" rx="1.5" fill={INK} />
      <motion.ellipse cx="120" cy="17" rx="13" ry="11" stroke={INK} strokeWidth="3.5"
        animate={{ fill: lantern }} transition={{ duration: reduce ? 0 : 0.3 }} />
      <g stroke={INK} strokeWidth="1.4" strokeOpacity="0.55">
        <line x1="108" y1="13" x2="132" y2="13" />
        <line x1="107" y1="17" x2="133" y2="17" />
        <line x1="108" y1="21" x2="132" y2="21" />
      </g>
      <rect x="112" y="27" width="16" height="4" rx="1.5" fill={INK} />

      <rect x="14" y="98" width="20" height="46" rx="8" fill="#14304f" stroke={INK} strokeWidth="4" />
      <rect x="206" y="98" width="20" height="46" rx="8" fill="#14304f" stroke={INK} strokeWidth="4" />
      <circle cx="24" cy="121" r="4" fill="#a89e8c" />
      <circle cx="216" cy="121" r="4" fill="#a89e8c" />

      <rect x="30" y="44" width="180" height="152" rx="40" fill="#1b3b6b" />
      <g clipPath="url(#robot-head-clip)" stroke={INK} strokeWidth="2" strokeOpacity="0.5">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line key={i} x1={150 + i * 10} y1="200" x2={214 + i * 10} y2="136" />
        ))}
      </g>
      <path d="M50 78 Q56 58 80 54" fill="none" stroke="#f1e6d2" strokeOpacity="0.3" strokeWidth="3.5" strokeLinecap="round" />
      <rect x="30" y="44" width="180" height="152" rx="40" fill="none" stroke={INK} strokeWidth="5" />

      <motion.rect x="50" y="64" width="140" height="110" rx="26" animate={{ fill: SCREEN[mood] }} transition={{ duration: reduce ? 0 : 0.3 }} />
      <g clipPath="url(#robot-screen-clip)">
        <AnimatePresence mode="wait" initial={false}>
          <Face key={mood === "idle" || mood === "scanning" || mood === "lost" ? "calm" : mood}
            mood={mood} gaze={gaze} blink={blink} color={FEATURE[mood]} reduce={reduce} />
        </AnimatePresence>
        {mood === "scanning" && !reduce && (
          <motion.rect x="50" width="140" height="3" fill={INK} opacity="0.45"
            initial={{ y: 66 }} animate={{ y: [66, 170, 66] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }} />
        )}
      </g>
      <rect x="50" y="64" width="140" height="110" rx="26" fill="none" stroke={INK} strokeWidth="4" />
    </motion.svg>
  );
}

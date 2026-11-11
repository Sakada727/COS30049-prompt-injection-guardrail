import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";

function useCircle(targetRef, active) {
  const [circle, setCircle] = useState(null);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = targetRef.current?.getBoundingClientRect();
        if (!box) return;
        setCircle({
          x: box.left + box.width / 2,
          y: box.top + box.height / 2,
          r: Math.max(box.width, box.height) * 0.36,
        });
      });
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [targetRef, active]);
  return active ? circle : null;
}

export default function Spotlight({ active, targetRef, onDismiss }) {
  const circle = useCircle(targetRef, active);

  useEffect(() => {
    if (!active) return;
    const onKey = (e) => e.key === "Escape" && onDismiss();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onDismiss]);

  return createPortal(
    <AnimatePresence>
      {active && circle && (
        <motion.div
          className="spotlight"
          aria-hidden="true"
          onClick={onDismiss}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            "--spot-x": `${circle.x}px`,
            "--spot-y": `${circle.y}px`,
            "--spot-r": `${circle.r}px`,
          }}
        />
      )}
    </AnimatePresence>,
    document.body,
  );
}

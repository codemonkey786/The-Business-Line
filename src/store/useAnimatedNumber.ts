import { useEffect, useRef, useState } from "react";

// Smoothly tweens the displayed number toward `target` (a slot-machine-ish roll rather than
// an instant snap), and reports which way it's currently moving so callers can flash a color
// while the roll is in flight.
export function useAnimatedNumber(target: number, durationMs = 900) {
  const [display, setDisplay] = useState(target);
  const [direction, setDirection] = useState<-1 | 0 | 1>(0);
  const displayRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const from = displayRef.current;
    if (Math.abs(target - from) < 0.001) return;

    setDirection(target > from ? 1 : -1);
    const start = performance.now();

    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      const current = from + (target - from) * eased;
      displayRef.current = current;
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        displayRef.current = target;
        setDisplay(target);
        setDirection(0);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);

  return { value: display, direction };
}

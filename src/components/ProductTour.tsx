import { useEffect, useLayoutEffect, useState } from "react";
import { X } from "lucide-react";

export interface TourStep {
  selector: string;
  title: string;
  body: string;
}

interface Props {
  steps: TourStep[];
  onFinish: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;
const CARD_WIDTH = 320;

export function ProductTour({ steps, onFinish }: Props) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = steps[index];

  // Re-measure the target's real on-screen position on every step change, and keep it in sync
  // as the layout shifts underneath (resize, scroll) — the highlight follows the live element
  // rather than a snapshot taken once.
  useLayoutEffect(() => {
    function measure() {
      const el = document.querySelector(step.selector);
      setRect(el ? el.getBoundingClientRect() : null);
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step.selector]);

  // If a step's target genuinely isn't on screen (collapsed sidebar, narrow viewport hiding the
  // nav, etc.), skip it automatically instead of stranding the tour on a dead step — but give
  // the DOM a brief grace window first, since right after an OAuth redirect the page can still
  // be settling when this first measures.
  useEffect(() => {
    if (rect) return;
    const timer = setTimeout(() => {
      const el = document.querySelector(step.selector);
      if (el) {
        setRect(el.getBoundingClientRect());
        return;
      }
      if (index < steps.length - 1) setIndex((i) => i + 1);
      else onFinish();
    }, 250);
    return () => clearTimeout(timer);
  }, [rect, index, steps.length, onFinish, step.selector]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onFinish();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onFinish]);

  if (!rect) return null;

  const isLast = index === steps.length - 1;
  const spaceBelow = window.innerHeight - (rect.top + rect.height);
  const placeAbove = spaceBelow < 170 && rect.top > 170;
  const cardTop = placeAbove ? rect.top - PAD : rect.top + rect.height + PAD;
  const cardLeft = Math.min(Math.max(rect.left, 16), window.innerWidth - CARD_WIDTH - 16);

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0" onClick={onFinish} />

      <div
        className="absolute rounded-lg pointer-events-none transition-all duration-300"
        style={{
          top: rect.top - PAD,
          left: rect.left - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.78)",
          border: "2px solid var(--color-amber)",
        }}
      />

      <div
        className="board absolute p-4 transition-all duration-300"
        style={{ top: cardTop, left: cardLeft, width: CARD_WIDTH, transform: placeAbove ? "translateY(-100%)" : undefined }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="mono-num text-[10px] font-bold text-[var(--color-amber)] uppercase tracking-wider">
            {index + 1} of {steps.length}
          </span>
          <button onClick={onFinish} className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors">
            <X size={14} />
          </button>
        </div>
        <p className="font-semibold text-[15px] mb-1">{step.title}</p>
        <p className="text-xs text-[var(--color-ink-dim)] leading-relaxed mb-3.5">{step.body}</p>
        <div className="flex items-center justify-between gap-2">
          <button onClick={onFinish} className="text-xs font-semibold text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors">
            Skip
          </button>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                onClick={() => setIndex((i) => i - 1)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/[0.08] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={() => (isLast ? onFinish() : setIndex((i) => i + 1))}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--color-amber)] text-black hover:brightness-110 active:scale-[0.98] transition-all"
            >
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

interface AnimatedStatCardProps {
  icon: LucideIcon;
  value: number;
  label: string;
  delay?: number;
  urgent?: boolean;
  formatValue?: (value: number) => string;
}

// Eases 0 -> value over ~1s using requestAnimationFrame, restarting whenever
// `value` changes (e.g. a fresh briefing after dismiss/reopen).
function useCountUp(value: number, durationMs = 1000, startDelayMs = 0) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const timeout = window.setTimeout(() => {
      function step(timestamp: number) {
        if (start === null) start = timestamp;
        const progress = Math.min((timestamp - start) / durationMs, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.round(eased * value));
        if (progress < 1) {
          frame = requestAnimationFrame(step);
        }
      }
      frame = requestAnimationFrame(step);
    }, startDelayMs);

    return () => {
      window.clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [value, durationMs, startDelayMs]);

  return displayValue;
}

export function AnimatedStatCard({ icon: Icon, value, label, delay = 0, urgent = false, formatValue }: AnimatedStatCardProps) {
  const [mounted, setMounted] = useState(false);
  const displayValue = useCountUp(value, 1000, delay);
  const hasEntered = useRef(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setMounted(true), delay);
    return () => window.clearTimeout(timeout);
  }, [delay]);

  hasEntered.current = mounted;

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm transition-all duration-500 ease-out sm:p-6 ${
        urgent ? "border-red-200 border-l-4 border-l-red-500" : "border-slate-200"
      } ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
    >
      <Icon size={24} className={urgent ? "text-red-500" : "text-primary"} />
      <div className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
        {formatValue ? formatValue(displayValue) : displayValue.toLocaleString()}
      </div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}

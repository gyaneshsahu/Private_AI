import { useEffect, useState } from "react";

export const ease = [0.22, 1, 0.36, 1] as const;

// Steps through a looping storyboard while `active`; rewinds to the start whenever it stops being active,
// so a visitor who scrolls away and back always sees the story from the beginning.
export function useLoop(durations: number[], active: boolean, paused: boolean, reduce: boolean) {
  const last = durations.length - 1;
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduce) setStep(last);
    else if (!active) setStep(0);
  }, [active, reduce, last]);

  useEffect(() => {
    if (reduce || !active || paused) return;
    const id = window.setTimeout(() => setStep((s) => (s >= last ? 0 : s + 1)), durations[step]);
    return () => window.clearTimeout(id);
  }, [step, active, paused, reduce, durations, last]);

  return step;
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

import { useEffect } from 'react';

/**
 * One-time reveal for [data-reveal] descendants of `ref`.
 * Adds `motion-ready` to the root (so hidden pre-states only apply when JS runs)
 * and `is-visible` to each target as it enters the viewport.
 * Reduced-motion users and browsers without IntersectionObserver get the final state.
 */
export default function useReveal(ref, deps = []) {
  useEffect(() => {
    const root = ref.current;
    const targets = Array.from(root?.querySelectorAll('[data-reveal]') || []);
    if (!root || !targets.length) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach(target => target.classList.add('is-visible'));
      return undefined;
    }

    root.classList.add('motion-ready');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.2 });

    targets.forEach(target => observer.observe(target));
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function smoothBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
}

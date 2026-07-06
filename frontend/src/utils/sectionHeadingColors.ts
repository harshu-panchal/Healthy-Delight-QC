export const SECTION_DOT_COLORS = [
  "#F97316",
  "#3B82F6",
  "#22C55E",
  "#A855F7",
  "#EC4899",
  "#14B8A6",
  "#EAB308",
  "#EF4444",
] as const;

export const getSectionDotColor = (seed: string | number): string => {
  if (typeof seed === "number") {
    return SECTION_DOT_COLORS[Math.abs(seed) % SECTION_DOT_COLORS.length];
  }

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SECTION_DOT_COLORS[Math.abs(hash) % SECTION_DOT_COLORS.length];
};

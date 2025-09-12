export const DETACHED_RAIL = {
  width: 6,
  visualGap: 12,     // << one source of truth for the visible gap
  outsideNudge: 2,   // tiny nudge so the rail sits cleanly outside the edge
  insideRight: 19    // used only for 'inside' mode (if you ever use it)
} as const;
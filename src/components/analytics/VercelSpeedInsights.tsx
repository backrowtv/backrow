import { SpeedInsights } from "@vercel/speed-insights/next";

// Speed Insights ships anonymous, aggregate Core Web Vitals (LCP/CLS/INP/TTFB/FCP)
// and sets no cookies — per Vercel's docs it does not require consent. Gating it
// behind the same toggle as Analytics left us with almost no field data, so perf
// regressions went undetected. Analytics (which tracks page views) stays gated.
export function VercelSpeedInsights() {
  return <SpeedInsights />;
}

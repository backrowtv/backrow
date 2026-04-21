"use client";

import { useEffect, useState } from "react";

const VIDEO_SRC = "/marketing/festival-demo.mp4";
const POSTER_SRC = "/marketing/festival-demo-poster.jpg";

export function FestivalDemoVideo() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(query.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  return (
    <video
      className="block aspect-video w-full bg-black"
      src={VIDEO_SRC}
      poster={POSTER_SRC}
      autoPlay={!prefersReducedMotion}
      loop
      muted
      playsInline
      preload="metadata"
      aria-label="BackRow festival demo"
    />
  );
}

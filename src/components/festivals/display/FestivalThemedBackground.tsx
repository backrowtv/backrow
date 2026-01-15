"use client";

import Image from "next/image";

// Gradient mapping from value to CSS gradient
const GRADIENT_MAP: Record<string, string> = {
  "rose-sunset": "linear-gradient(135deg, #f43f5e 0%, #ec4899 50%, #a855f7 100%)",
  "teal-ocean": "linear-gradient(135deg, #14b8a6 0%, #06b6d4 50%, #3b82f6 100%)",
  "rose-teal": "linear-gradient(135deg, #f43f5e 0%, #ec4899 50%, #14b8a6 100%)",
  "dark-rose": "linear-gradient(135deg, #831843 0%, #9f1239 50%, #be123c 100%)",
  "dark-teal": "linear-gradient(135deg, #134e4a 0%, #0f766e 50%, #14b8a6 100%)",
  "purple-dreams": "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)",
  "cinema-dark": "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)",
  "warm-glow": "linear-gradient(135deg, #f97316 0%, #f43f5e 50%, #ec4899 100%)",
};

// Preset image mapping
const PRESET_IMAGE_MAP: Record<string, string> = {
  "classic-cinema": "/images/backgrounds/classic-cinema.jpg",
  "neon-theater": "/images/backgrounds/neon-theater.jpg",
  "vintage-projector": "/images/backgrounds/vintage-projector.jpg",
  "golden-age": "/images/backgrounds/golden-age.jpg",
};

interface FestivalThemedBackgroundProps {
  backgroundType?: string | null;
  backgroundValue?: string | null;
  className?: string;
}

export function FestivalThemedBackground({
  backgroundType,
  backgroundValue,
  className = "",
}: FestivalThemedBackgroundProps) {
  // Don't render if no background is set
  if (!backgroundType || !backgroundValue) {
    return null;
  }

  // Handle gradient backgrounds - still show as simple gradient (no theater frame)
  if (backgroundType === "gradient") {
    const gradient = GRADIENT_MAP[backgroundValue] || backgroundValue;
    return (
      <div className={`relative z-0 ${className}`}>
        <div className="w-full flex justify-center px-3 sm:px-4 pt-2">
          <div
            className="w-full max-w-4xl rounded-xl sm:rounded-2xl border-4 sm:border-[6px] border-neutral-800"
            style={{
              aspectRatio: "2 / 1",
              background: gradient,
              boxShadow: `
                0 25px 80px rgba(0,0,0,0.5),
                0 10px 30px rgba(0,0,0,0.4),
                inset 0 0 20px rgba(0,0,0,0.5)
              `,
            }}
          />
        </div>
      </div>
    );
  }

  // Get image URL
  let imageUrl = "";
  if (backgroundType === "preset_image") {
    imageUrl = PRESET_IMAGE_MAP[backgroundValue] || backgroundValue;
  } else if (backgroundType === "custom_image") {
    imageUrl = backgroundValue;
  } else {
    return null;
  }

  return (
    <div className={`relative z-0 ${className}`}>
      <div className="w-full flex justify-center px-3 sm:px-4 pt-2">
        <div
          className="relative w-full max-w-4xl rounded-xl sm:rounded-2xl border-4 sm:border-[6px] border-neutral-800 overflow-hidden"
          style={{
            aspectRatio: "2 / 1",
            boxShadow: `
              0 25px 80px rgba(0,0,0,0.5),
              0 10px 30px rgba(0,0,0,0.4),
              inset 0 0 20px rgba(0,0,0,0.5)
            `,
          }}
        >
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 90vw, 1280px"
            className="object-cover"
            priority
          />
        </div>
      </div>
    </div>
  );
}

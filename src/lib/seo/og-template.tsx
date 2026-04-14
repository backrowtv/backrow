import { ImageResponse } from "next/og";
import { loadRighteous } from "./og-fonts";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png" as const;

export const BRAND_PRIMARY = "#6B9B6B";
export const BRAND_BG = "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)";
export const BRAND_MUTED = "#9ca3af";
export const BRAND_SURFACE = "#141815";

// Filled SVG path for the BackRow logo icon.
export const LOGO_PATH = `M250.04 132.00C 275.15 132.00 294.07 154.38 290.20 179.15Q 287.88 193.94 275.68 204.31A 0.37 0.37 0.0 0 0 275.81 204.95Q 304.59 213.72 317.27 240.88A 0.33 0.32 44.8 0 0 317.86 240.88Q 328.68 217.57 351.78 207.66C 353.81 206.79 356.89 205.73 359.28 204.96A 0.39 0.39 0.0 0 0 359.42 204.30Q 354.54 199.79 353.11 197.90C 336.45 175.84 344.74 144.47 370.86 134.61C 401.57 123.02 432.31 150.85 424.56 182.55Q 421.43 195.36 410.72 204.27A 0.38 0.37 39.8 0 0 410.78 204.89Q 411.11 205.07 414.75 206.30Q 428.79 211.02 439.46 222.03Q 458.08 241.23 458.26 268.78Q 458.46 299.97 458.31 363.09A 0.43 0.42 -90.0 0 1 457.89 363.52Q 333.25 363.52 331.00 363.50Q 326.54 363.46 320.51 363.72C 315.84 363.93 311.11 363.52 306.50 363.51Q 305.09 363.51 250.03 363.50Q 194.96 363.50 193.55 363.50C 188.94 363.51 184.21 363.92 179.54 363.71Q 173.51 363.45 169.05 363.49Q 166.80 363.51 42.16 363.49A 0.43 0.42 -90.0 0 1 41.74 363.06Q 41.60 299.93 41.81 268.75Q 41.99 241.20 60.61 222.00Q 71.29 210.99 85.33 206.27Q 88.97 205.04 89.30 204.86A 0.38 0.37 -39.7 0 0 89.36 204.24Q 78.65 195.33 75.52 182.52C 67.78 150.82 98.52 122.99 129.23 134.59C 155.35 144.45 163.63 175.83 146.97 197.88Q 145.54 199.77 140.66 204.28A 0.39 0.39 0.0 0 0 140.80 204.94C 143.19 205.71 146.27 206.77 148.30 207.64Q 171.39 217.56 182.21 240.87A 0.33 0.32 -44.8 0 0 182.80 240.87Q 195.49 213.71 224.27 204.95A 0.37 0.37 0.0 0 0 224.40 204.31Q 212.20 193.93 209.88 179.14C 206.01 154.38 224.94 132.00 250.04 132.00ZM 114.94 202.27Q 116.20 202.27 126.51 202.49Q 128.62 202.54 130.49 201.48Q 141.40 195.37 145.59 184.02C 153.43 162.73 137.76 140.06 114.98 140.05C 92.20 140.03 76.50 162.68 84.32 183.98Q 88.49 195.34 99.39 201.46Q 101.26 202.52 103.37 202.48Q 113.68 202.27 114.94 202.27ZM 250.18 202.28Q 251.44 202.28 261.75 202.50Q 263.86 202.55 265.73 201.48Q 276.65 195.37 280.83 184.02C 288.68 162.72 273.00 140.04 250.21 140.03C 227.42 140.02 211.72 162.68 219.54 183.99Q 223.72 195.34 234.62 201.47Q 236.49 202.53 238.61 202.48Q 248.92 202.28 250.18 202.28ZM 385.02 202.27Q 386.28 202.27 396.59 202.49Q 398.70 202.54 400.57 201.48Q 411.48 195.37 415.67 184.02C 423.52 162.73 407.85 140.06 385.06 140.05C 362.28 140.03 346.58 162.68 354.40 183.99Q 358.57 195.34 369.47 201.46Q 371.34 202.52 373.46 202.48Q 383.76 202.27 385.02 202.27ZM 58.95 346.47L 170.87 346.47A 1.09 1.09 0.0 0 0 171.96 345.38L 171.96 270.22A 51.03 51.00 -90.0 0 0 120.96 219.19L 108.86 219.19A 51.03 51.00 90.0 0 0 57.86 270.22L 57.86 345.38A 1.09 1.09 0.0 0 0 58.95 346.47ZM 193.74 346.37L 306.08 346.57A 0.85 0.85 0.0 0 0 306.93 345.72L 307.06 270.16A 50.83 50.82 -89.9 0 0 256.33 219.24L 243.93 219.22A 50.83 50.82 -89.9 0 0 193.02 269.96L 192.89 345.52A 0.85 0.85 0.0 0 0 193.74 346.37ZM 329.11 346.48L 441.03 346.48A 1.03 1.03 0.0 0 0 442.06 345.45L 442.06 270.00A 50.60 49.79 -90.0 0 0 392.27 219.40L 377.87 219.40A 50.60 49.79 90.0 0 0 328.08 270.00L 328.08 345.45A 1.03 1.03 0.0 0 0 329.11 346.48Z`;

type BrandMarkProps = {
  size?: "sm" | "md" | "lg";
};

export function LogoGlyph({ size = 80 }: { size?: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        background: "linear-gradient(160deg, #5A8A5A 0%, #3D6B3D 100%)",
        borderRadius: size * 0.2,
        position: "relative",
        boxShadow: "inset 0 2px 4px rgba(255,255,255,0.08), 0 4px 12px rgba(0,0,0,0.4)",
      }}
    >
      <svg
        viewBox="40 130 420 240"
        width={size * 0.7}
        height={size * 0.7}
        fill="rgba(0,0,0,0.35)"
        style={{ position: "absolute", transform: "translate(3px, 3px)" }}
      >
        <path fillRule="evenodd" d={LOGO_PATH} />
      </svg>
      <svg
        viewBox="40 130 420 240"
        width={size * 0.7}
        height={size * 0.7}
        fill="white"
        style={{ position: "relative" }}
      >
        <path fillRule="evenodd" d={LOGO_PATH} />
      </svg>
    </div>
  );
}

export function BrandWordmark({ size = "md" }: BrandMarkProps) {
  const fontSize = size === "lg" ? 88 : size === "sm" ? 42 : 64;
  return (
    <div
      style={{
        display: "flex",
        color: BRAND_PRIMARY,
        fontSize,
        fontFamily: "Righteous",
        letterSpacing: "-0.01em",
        textShadow: "0 2px 4px rgba(0,0,0,0.5)",
      }}
    >
      BackRow
    </div>
  );
}

export function BrandLockup({ size = "md" }: BrandMarkProps) {
  const glyphSize = size === "lg" ? 96 : size === "sm" ? 48 : 72;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size === "sm" ? 12 : 20 }}>
      <LogoGlyph size={glyphSize} />
      <BrandWordmark size={size} />
    </div>
  );
}

// Poster thumbnail — STRICT 2:3 aspect ratio (memory: feedback_poster_aspect_ratio).
// Constrain width; height is derived. Never change the ratio.
export function PosterThumb({ src, width = 220 }: { src: string | null; width?: number }) {
  const height = Math.round((width * 3) / 2);
  if (!src) {
    return (
      <div
        style={{
          display: "flex",
          width,
          height,
          background: BRAND_SURFACE,
          borderRadius: 12,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.5)",
        }}
      />
    );
  }
  return (
    <div
      style={{
        display: "flex",
        width,
        height,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        width={width}
        height={height}
        alt=""
        style={{ width, height, objectFit: "cover" }}
      />
    </div>
  );
}

type OgShellProps = {
  children: React.ReactNode;
  accentColor?: string;
};

// Matte tactile shell — NO neon, NO colored-text-on-colored-bg, NO gray nested cards
// (memory: feedback_ui_styling_preferences).
export function OgShell({ children, accentColor }: OgShellProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: BRAND_BG,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        fontFamily: "Righteous",
      }}
    >
      {/* Subtle debossed edge */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          border: "1px solid rgba(255,255,255,0.03)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.6)",
          pointerEvents: "none",
        }}
      />
      {/* Accent strip top */}
      {accentColor && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: accentColor,
            display: "flex",
          }}
        />
      )}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: 80,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export async function renderOg(element: React.ReactElement) {
  const righteous = await loadRighteous();
  return new ImageResponse(element, {
    ...OG_SIZE,
    ...(righteous && {
      fonts: [
        {
          name: "Righteous",
          data: righteous,
          style: "normal",
          weight: 400,
        },
      ],
    }),
  });
}

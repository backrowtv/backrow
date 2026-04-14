import { ImageResponse } from "next/og";

// Image metadata
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";
export const alt = "BackRow - Movie Clubs";

// Main icon path data
const iconPath = `M250.04 132.00
C 275.15 132.00 294.07 154.38 290.20 179.15
Q 287.88 193.94 275.68 204.31
A 0.37 0.37 0.0 0 0 275.81 204.95
Q 304.59 213.72 317.27 240.88
A 0.33 0.32 44.8 0 0 317.86 240.88
Q 328.68 217.57 351.78 207.66
C 353.81 206.79 356.89 205.73 359.28 204.96
A 0.39 0.39 0.0 0 0 359.42 204.30
Q 354.54 199.79 353.11 197.90
C 336.45 175.84 344.74 144.47 370.86 134.61
C 401.57 123.02 432.31 150.85 424.56 182.55
Q 421.43 195.36 410.72 204.27
A 0.38 0.37 39.8 0 0 410.78 204.89
Q 411.11 205.07 414.75 206.30
Q 428.79 211.02 439.46 222.03
Q 458.08 241.23 458.26 268.78
Q 458.46 299.97 458.31 363.09
A 0.43 0.42 -90.0 0 1 457.89 363.52
Q 333.25 363.52 331.00 363.50
Q 326.54 363.46 320.51 363.72
C 315.84 363.93 311.11 363.52 306.50 363.51
Q 305.09 363.51 250.03 363.50
Q 194.96 363.50 193.55 363.50
C 188.94 363.51 184.21 363.92 179.54 363.71
Q 173.51 363.45 169.05 363.49
Q 166.80 363.51 42.16 363.49
A 0.43 0.42 -90.0 0 1 41.74 363.06
Q 41.60 299.93 41.81 268.75
Q 41.99 241.20 60.61 222.00
Q 71.29 210.99 85.33 206.27
Q 88.97 205.04 89.30 204.86
A 0.38 0.37 -39.7 0 0 89.36 204.24
Q 78.65 195.33 75.52 182.52
C 67.78 150.82 98.52 122.99 129.23 134.59
C 155.35 144.45 163.63 175.83 146.97 197.88
Q 145.54 199.77 140.66 204.28
A 0.39 0.39 0.0 0 0 140.80 204.94
C 143.19 205.71 146.27 206.77 148.30 207.64
Q 171.39 217.56 182.21 240.87
A 0.33 0.32 -44.8 0 0 182.80 240.87
Q 195.49 213.71 224.27 204.95
A 0.37 0.37 0.0 0 0 224.40 204.31
Q 212.20 193.93 209.88 179.14
C 206.01 154.38 224.94 132.00 250.04 132.00
Z
M 114.94 202.27
Q 116.20 202.27 126.51 202.49
Q 128.62 202.54 130.49 201.48
Q 141.40 195.37 145.59 184.02
C 153.43 162.73 137.76 140.06 114.98 140.05
C 92.20 140.03 76.50 162.68 84.32 183.98
Q 88.49 195.34 99.39 201.46
Q 101.26 202.52 103.37 202.48
Q 113.68 202.27 114.94 202.27
Z
M 250.18 202.28
Q 251.44 202.28 261.75 202.50
Q 263.86 202.55 265.73 201.48
Q 276.65 195.37 280.83 184.02
C 288.68 162.72 273.00 140.04 250.21 140.03
C 227.42 140.02 211.72 162.68 219.54 183.99
Q 223.72 195.34 234.62 201.47
Q 236.49 202.53 238.61 202.48
Q 248.92 202.28 250.18 202.28
Z
M 385.02 202.27
Q 386.28 202.27 396.59 202.49
Q 398.70 202.54 400.57 201.48
Q 411.48 195.37 415.67 184.02
C 423.52 162.73 407.85 140.06 385.06 140.05
C 362.28 140.03 346.58 162.68 354.40 183.99
Q 358.57 195.34 369.47 201.46
Q 371.34 202.52 373.46 202.48
Q 383.76 202.27 385.02 202.27
Z
M 58.95 346.47
L 170.87 346.47
A 1.09 1.09 0.0 0 0 171.96 345.38
L 171.96 270.22
A 51.03 51.00 -90.0 0 0 120.96 219.19
L 108.86 219.19
A 51.03 51.00 90.0 0 0 57.86 270.22
L 57.86 345.38
A 1.09 1.09 0.0 0 0 58.95 346.47
Z
M 193.74 346.37
L 306.08 346.57
A 0.85 0.85 0.0 0 0 306.93 345.72
L 307.06 270.16
A 50.83 50.82 -89.9 0 0 256.33 219.24
L 243.93 219.22
A 50.83 50.82 -89.9 0 0 193.02 269.96
L 192.89 345.52
A 0.85 0.85 0.0 0 0 193.74 346.37
Z
M 329.11 346.48
L 441.03 346.48
A 1.03 1.03 0.0 0 0 442.06 345.45
L 442.06 270.00
A 50.60 49.79 -90.0 0 0 392.27 219.40
L 377.87 219.40
A 50.60 49.79 90.0 0 0 328.08 270.00
L 328.08 345.45
A 1.03 1.03 0.0 0 0 329.11 346.48
Z`;

// OpenGraph Image - appears when sharing on social media
export default async function OpenGraphImage() {
  // Load Righteous font from Google Fonts with error handling
  let righteousFont: ArrayBuffer | null = null;
  try {
    const response = await fetch(
      "https://fonts.gstatic.com/s/righteous/v17/1cXxaUPXBpj2rGoU7C9mj3uEicG01A.woff2"
    );
    if (response.ok && response.headers.get("content-type")?.includes("font")) {
      righteousFont = await response.arrayBuffer();
    }
  } catch {
    // Font fetch failed, will use fallback
  }

  return new ImageResponse(
    <div
      style={{
        fontSize: 60,
        background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
      }}
    >
      {/* Logo Icon with emboss effect */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 200,
          height: 200,
          background: "linear-gradient(160deg, #5A8A5A 0%, #3D6B3D 100%)",
          borderRadius: 40,
          position: "relative",
        }}
      >
        {/* Shadow layer */}
        <svg
          viewBox="40 130 420 240"
          width="140"
          height="140"
          fill="rgba(0,0,0,0.3)"
          style={{ position: "absolute", transform: "translate(4px, 4px)" }}
        >
          <path fillRule="evenodd" d={iconPath} />
        </svg>
        {/* Main icon */}
        <svg
          viewBox="40 130 420 240"
          width="140"
          height="140"
          fill="white"
          style={{ position: "relative" }}
        >
          <path fillRule="evenodd" d={iconPath} />
        </svg>
      </div>

      {/* Site Name - Righteous font */}
      <div
        style={{
          display: "flex",
          color: "#6B9B6B",
          fontSize: 80,
          fontFamily: "Righteous",
          letterSpacing: "-0.01em",
        }}
      >
        BackRow
      </div>

      {/* Tagline */}
      <div
        style={{
          display: "flex",
          color: "#9ca3af",
          fontSize: 32,
          marginTop: -20,
        }}
      >
        Where movie clubs come together
      </div>
    </div>,
    {
      ...size,
      // Only include font if successfully loaded
      ...(righteousFont && {
        fonts: [
          {
            name: "Righteous",
            data: righteousFont,
            style: "normal",
            weight: 400,
          },
        ],
      }),
    }
  );
}

export const RIGHTEOUS_URL =
  "https://fonts.gstatic.com/s/righteous/v17/1cXxaUPXBpj2rGoU7C9mj3uEicG01A.woff2";

export async function loadRighteous(): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(RIGHTEOUS_URL);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("font") && !contentType.includes("octet-stream")) return null;
    return await response.arrayBuffer();
  } catch {
    return null;
  }
}

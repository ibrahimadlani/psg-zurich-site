/** Image type from its first bytes (we accept what browsers produce from a canvas). */
export function imageType(data: Uint8Array): "image/webp" | "image/png" | "image/jpeg" | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...data.subarray(start, end));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (data[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "image/jpeg";
  return null;
}

export const MAX_AVATAR_BYTES = 300 * 1024;

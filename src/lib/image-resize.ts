/** Shrinks an image in the browser (longest side ≤ maxSize) and encodes it as WebP (PNG where unsupported). */
export async function resizeImage(file: File, maxSize: number, square = false) {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const source = square
    ? { x: (bitmap.width - side) / 2, y: (bitmap.height - side) / 2, width: side, height: side }
    : { x: 0, y: 0, width: bitmap.width, height: bitmap.height };
  const scale = Math.min(1, maxSize / Math.max(source.width, source.height));
  const width = Math.round(source.width * scale);
  const height = Math.round(source.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, source.x, source.y, source.width, source.height, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("Encoding failed"))), "image/webp", 0.82),
  );
  return { blob, width, height };
}

/** Resizes then uploads an article image; returns its media id. */
export async function uploadMedia(file: File, maxSize: number) {
  const { blob, width, height } = await resizeImage(file, maxSize);
  const response = await fetch(`/api/v1/media?w=${width}&h=${height}`, { method: "POST", body: blob });
  if (!response.ok) throw new Error(`Upload failed (${response.status})`);
  const { data } = (await response.json()) as { data: { id: string; url: string } };
  return data;
}

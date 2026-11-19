import { MAX_CLIP_BYTES, type ClipPayload } from "./clipboard-model";
export async function imagePayload(file: Blob): Promise<ClipPayload> {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > MAX_CLIP_BYTES
  )
    throw Error("clipTooLarge");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 32_000_000) throw Error("clipTooLarge");
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
    const data = canvas.toDataURL("image/png");
    const scale = Math.min(1, 160 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas
      .getContext("2d")!
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return { kind: "image", data, thumbnail: canvas.toDataURL("image/png") };
  } finally {
    bitmap.close();
  }
}
export function pngBlob(data: string): Blob {
  const bytes = Uint8Array.from(atob(data.split(",")[1]), (c) =>
    c.charCodeAt(0),
  );
  return new Blob([bytes], { type: "image/png" });
}
export async function payloadFromPaste(
  data: DataTransfer,
): Promise<ClipPayload | null> {
  for (const file of Array.from(data.files)) {
    if (file.type.startsWith("image/")) return imagePayload(file);
  }
  const text = data.getData("text/plain");
  return text ? { kind: "text", data: text } : null;
}
